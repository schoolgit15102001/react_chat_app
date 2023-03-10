import { StyleSheet, Text, View, TouchableOpacity, TextInput, ScrollView, ActivityIndicator, Modal, TouchableWithoutFeedback, } from 'react-native'
import React, { useContext, useEffect, useRef, useState } from 'react'
import { SafeAreaView } from 'react-native-safe-area-context'
import Ionicons from 'react-native-vector-icons/Ionicons'
import Messager from '../components/Messager'
import { KeyboardAwareScrollView } from 'react-native-keyboard-aware-scroll-view'
import { Url, UrlSK } from '../contexts/constants'
import { AuthContext } from '../contexts/AuthContext'
import { io } from 'socket.io-client';
import * as ImagePicker from 'expo-image-picker';
import * as DocumentPicker from 'expo-document-picker';
import  moment from 'moment';
import 'moment/locale/vi';

// send image
import storage from '../firebase/Firebase';
import { ref, uploadBytes, getDownloadURL } from 'firebase/storage';

import axios from 'axios'

export default function ChattingScreen({ navigation }) {
  const [newMessage, setNewMessage] = useState("");
  const scrollView_ref = useRef();
  const [messages, setMessages] = useState([]);
  const [user, setUser] = useState([]);
  const { userInfo, currentChat, socket, setSenderMessage, setRecallStatus, userCons } = useContext(AuthContext);
  const [arrivalMessage, setArrivalMessages] = useState(null);
  const [Nmember, setNMember] = useState(0);
  const [recallMessage, setRecallMessages] = useState(null);
  const [modalVisible, setModalVisible] = useState(false);
  const [isLoading, setIsLoading] = useState(false)
  
  
  const mess=(m)=>{
    if(m!=null){
      if(m.length<=25)
        return m
      else 
        return m.slice(0,21)+'...'}
    return ""
  }

  useEffect(() => {
    const friendId = currentChat.members.find((m) => m !== userInfo._id);
    const getUser = async () => {
      try {
        const res = await axios(`${Url}/api/users?userId=${friendId}`);
        setUser(res.data);
      } catch (err) {
        console.log(err);
      }
    }
    getUser();
    
  }, [userInfo._id, currentChat]);
  const getOnline=()=>{
    if(!currentChat.name)
    {
        if(user.isActive)
          return "??ang ho???t ?????ng"
        else
        {
          return 'Ho???t ?????ng ' + moment(user.updatedAt).fromNow()
        }         
    }
    else
      return "";
  }
  useEffect(() => {
    const getMessages = async () => {
      let messageList = [];
      try {
        const res = await axios.get(`${Url}/api/messages/${currentChat._id}`);

        for (let i = 0; i < res.data.length; i++) {
          if (res.data[i].delUser[0] !== userInfo._id) {
            if (res.data[i].reCall === true) {
              res.data[i].text = "tin nh???n ???? ???????c thu h???i"
              messageList.push(res.data[i]);
            }
            else {
              messageList.push(res.data[i]);
            }
          }

        }

        for (let i = 0; i < res.data.length; i++) {

        }
        setMessages(messageList);
      } catch (err) {
        console.log(err);
      }
    };
    getMessages();
  }, [currentChat]);
  useEffect(() => { setNMember(currentChat.members.length) }, [userCons]);
  useEffect(() => {
    // socket.current = io(`${UrlSK}`);
    socket.current.on("getMessage", (data) => {
      setArrivalMessages({
        _id: data._id,
        sender: data.senderId,
        text: data.text,
        type: data.type,
        reCall: data.reCall,
        delUser: data.delUser,
        conversationId: data.conversationId,
        createdAt: data.date,
        username: data.username,
        avt: data.avt,
      });

    });
    socket.current.on("getStatus", (data) => {
      setSenderMessage({
        _id: Math.random(),
        sender: data.senderId,
        text: data.text,
        type: data.type,
        delUser: data.delUser,
        conversationId: data.conversationId,
        createdAt: data.date,
        username: data.username,
      });
      setRecallStatus(null)
    });

    socket.current.on("recallMgsStatus", (data) => {
      setRecallStatus({
        _id: Math.random(),
        sender: data.senderId,
        text: data.text,
        type: data.type,
        delUser: data.delUser,
        conversationId: data.conversationId,
        createdAt: data.date,
        username: data.username,
      })
    });

  }, [currentChat]);
  const ktt = (messages) => {
    if (messages.length == 0)
      return true;
    else
      if (messages[messages.length - 1]._id != arrivalMessage._id)
        return true;
      else return false;
  }
  useEffect(() => {
    arrivalMessage && currentChat?.members.includes(arrivalMessage.sender) &&
      currentChat?._id === arrivalMessage.conversationId && ktt(messages) &&
      // messages[messages.length-1]._id != arrivalMessage._id &&
      setMessages((prev) => [...prev, arrivalMessage])
    // console.log("arrivalMessage:",arrivalMessage)
  }, [arrivalMessage, currentChat])

  // useEffect(() => {
  //   socket.current.emit("addUser", userInfo._id);
  //   socket.current.on("getUsers", (users) => {
  //     console.log(users)
  //   })},[userInfo._id]);
  const onClickDeleteMgs = (id) => {
    setRecallMessages(id);
    // const mgsdelete = messages.filter(
    //   (message) => message._id !== id
    // );
    // messages.find((message) => message._id !== id).text = "tin nh???n ???? ???????c b???n x??a";
    // setMessages(messages);

    const receiverIds = [];

    for (let index = 0; index < currentChat.members.length; index++) {
      if (currentChat.members[index] !== userInfo._id) {
        receiverIds.push(currentChat.members[index]);
      }
    }
    //g???i tin nh???n thu h???i
    socket.current.emit("deleteMessage", {
      _id: Math.random(),
      messagesCurrent: messages,
      messageId: id,
      senderId: userInfo._id,
      receiverIds,
      reCall: true,
      text: "tin nh???n ???? ???????c thu h???i",
    });

    socket.current.emit("recallMessageStatus", {
      senderId: userInfo._id,
      username: userInfo.username,
      receiverIds: currentChat.members,
      type: 0,
      text: "tin nh???n ???? ???????c thu h???i",
      conversationId: currentChat._id,
      delUser: "",
      date: Date.now(),
    });
  }
  //nh???n tin nh???n thu h???i
  useEffect(() => {

    socket.current.on("delMgs", (data) => {
      // console.log(data.messageId)
      setMessages(data.messagesCurrent)

      //nh???n v??o v?? ????a v??o Mess
      // setArrivalMessages({
      //   sender: data.senderId,
      //   text: data.text,
      //   createdAt: Date.now(),
      // })

    });


  }, []);
  //x??a tin nh???n ph??a t??i (tin nh???n c???a t??i)
  const onClickDeleteMgsMy = (id) => {

    const mgsdelete = messages.filter(
      (message) => message._id !== id
    );

    setMessages(mgsdelete);
  }

  //x??a tin nh???n ph??a t??i (tin nh???n c???a b???n)
  const onClickDeleteMgsOfFri = async (id) => {
    const mgsList = messages.filter(
      (mes) => mes.delUser !== id
    )
    setMessages(mgsList)

  }
  const sendSubmit = async () => {

    if (newMessage.trim() !== "") {
      const message = {
        sender: userInfo._id,
        text: newMessage,
        type: 0,
        conversationId: currentChat._id,
        reCall: false,
        delUser: "",
        date: Date.now(),
        username: userInfo.username,
        avt: userInfo.avt,
      };




      // const receiverId = currentChat.members.find(
      //   (member) => member !== _id
      // );
      const receiverIds = [];

      for (let index = 0; index < currentChat.members.length; index++) {
        if (currentChat.members[index] !== userInfo._id) {
          receiverIds.push(currentChat.members[index]);
        }
      }


      try {
        const res = await axios.post(`${Url}/api/messages`, message);
        // setMessages([...messages, res.data]);  
        socket.current.emit("sendMessage", {
          _id: res.data._id,
          senderId: userInfo._id,
          receiverIds,
          type: 0,
          text: newMessage,
          conversationId: currentChat._id,
          reCall: false,
          delUser: "",
          date: Date.now(),
          username: userInfo.username,
          avt: userInfo.avt,
        });

        socket.current.emit("sendStatus", {
          senderId: userInfo._id,
          username: userInfo.username,
          receiverIds: currentChat.members,
          type: 0,
          text: newMessage,
          conversationId: currentChat._id,
          delUser: "",
          date: Date.now(),

        })

      } catch (err) {
        console.log(err);
      }

    }
  };
  const handleOpenSettings = () => {
    if (Platform.OS === 'ios') {
      Linking.openURL('app-settings:');
    } else {
      Linking.openSettings();
    }
};
  const showImagePicker = async () => {
    // Ask the user for the permission to access the media library 
    const permissionResult = await ImagePicker.requestMediaLibraryPermissionsAsync();

    if (permissionResult.granted === false) {
      Alert.alert(
        "C???p quy???n truy c???p",
        "B???n c???n c???p quy???n cho ph??p ???ng d???ng n??y truy c???p v??o ???nh c???a b???n \n\nB???m m??? c??i ?????t, ch???n Quy???n v?? b???t ON c??c quy???n t????ng th??ch",
        [
          {
            text: 'H???y',
          },
          {
            text: 'M??? c??i ?????t',
            onPress: () => handleOpenSettings(),
          },
        ], {
        cancelable: true,
      });
      return;
    }
    setModalVisible(false);
    const result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ImagePicker.MediaTypeOptions.Images,
      allowsMultipleSelection: true,
      quality: 1,
    }
    );

    // Explore the result 
    if (!result.cancelled) {
      // console.log(result);
      handleImageChange(result);
    }
  }
  const openCamera = async () => {
    // Ask the user for the permission to access the camera
    const permissionResult = await ImagePicker.requestCameraPermissionsAsync();

    if (permissionResult.granted === false) {
      Alert.alert(
        "C???p quy???n truy c???p",
        "B???n c???n c???p quy???n cho ph??p ???ng d???ng n??y truy c???p v??o m??y ???nh c???a b???n \n\nB???m m??? c??i ?????t, ch???n Quy???n v?? b???t ON c??c quy???n t????ng th??ch",
        [
          {
            text: 'H???y',
          }, {
            text: 'M??? c??i ?????t',
            onPress: () => handleOpenSettings(),
          },
        ], {
        cancelable: true,
      });
      return;
    }
    setModalVisible(false);
    const result = await ImagePicker.launchCameraAsync(
      {
        mediaTypes: ImagePicker.MediaTypeOptions.Images,

        quality: 1,

      }
    );

    // Explore the result
    if (!result.cancelled) {
      // setImage(result.uri);
      // console.log(result.uri);
      handleImageChange(result);
    }
  }
  const showFilePicker = async () => {
    // Ask the user for the permission to access the media library 
    const permissionResult = await ImagePicker.requestMediaLibraryPermissionsAsync();

    if (permissionResult.granted === false) {
      Alert.alert(
        "C???p quy???n truy c???p",
        "B???n c???n c???p quy???n cho ph??p ???ng d???ng n??y truy c???p v??o b??? nh??? c???a b???n \n\nB???m m??? c??i ?????t, ch???n Quy???n v?? b???t ON c??c quy???n t????ng th??ch",
        [
          {
            text: 'H???y',
          },
          {
            text: 'M??? c??i ?????t',
            onPress: () => handleOpenSettings(),
          },
        ], {
        cancelable: true,
      });
      return;
    }
    setModalVisible(false);
    const result = await DocumentPicker.getDocumentAsync({
      allowsMultipleSelection: true,
      // quality: 1,
    }
    );

    // Explore the result 
    if (!result.cancelled) {
      // console.log(result);
      if(result.type!='cancel')
      handleFileChange(result);

    }
  }
  //send image
  const handleImageChange = async (image) => {
    const messageimage = {
      sender: userInfo._id,
      text: '',
      type: 1,
      conversationId: currentChat._id,
      reCall: false,
      delUser: "",
      date: Date.now(),
      username: userInfo.username,
      avt: userInfo.avt,
    };

    const blob = await new Promise((resolve, reject) => {
      const xhr = new XMLHttpRequest();
      xhr.onload = function () {
        resolve(xhr.response);
      };
      xhr.onerror = function (e) {
        console.log(e);
        reject(new TypeError("Network request failed"));
      };
      xhr.responseType = "blob";
      xhr.open("GET", image.uri, true);
      xhr.send(null);
    });
    setIsLoading(true);
    const filed = image.uri.slice(image.uri.lastIndexOf('.') + 1, image.uri.length);
    const fileName = image.uri.slice(image.uri.lastIndexOf('/') + 1, image.uri.lastIndexOf('.')) + "-" + Date.now()+"."+filed;
    const imageRef = ref(storage, `/image/${fileName}`);
    uploadBytes(imageRef, blob)
      .then(() => {
        getDownloadURL(imageRef)
          .then(async (url) => {

            messageimage.text = url
            setIsLoading(false);



            const receiverIds = [];
            for (let index = 0; index < currentChat.members.length; index++) {
              if (currentChat.members[index] !== userInfo._id) {
                receiverIds.push(currentChat.members[index]);
              }
            }
            try {
              const res = await axios.post(`${Url}/api/messages`, messageimage);
              // setMessages([...messages, res.data]);
              socket.current.emit("sendMessage", {
                _id: res.data._id,
                senderId: userInfo._id,
                receiverIds,
                type: 1,
                text: messageimage.text,
                conversationId: currentChat._id,
                reCall: false,
                delUser: "",
                date: Date.now(),
                username: userInfo.username,
                avt: userInfo.avt,
              });

              socket.current.emit("sendStatus", {
                senderId: userInfo._id,
                username: userInfo.username,
                receiverIds: currentChat.members,
                type: 1,
                text: messageimage.text,
                conversationId: currentChat._id,
                delUser: "",
                date: Date.now(),

              });
            }
            catch (err) {
              console.log(err);
            }
          })
          .catch((error) => {
            console.log(error.message, "error getting the image url");
          });

      })
      .catch((error) => {
        console.log(error.message);
      });

  };
  // send all file
  const handleFileChange = async (file) => {
    const messageFile = {
      sender: userInfo._id,
      text: '',
      type: file.mimeType.match('image') ? 1 : file.mimeType.match('video') ? 2 : 3,
      conversationId: currentChat._id,
      reCall: false,
      delUser: "",
      date: Date.now(),
      username: userInfo.username,
      avt: userInfo.avt,
    };
    const blob = await new Promise((resolve, reject) => {
      const xhr = new XMLHttpRequest();
      xhr.onload = function () {
        resolve(xhr.response);
      };
      xhr.onerror = function (e) {
        console.log(e);
        reject(new TypeError("Network request failed"));
      };
      xhr.responseType = "blob";
      xhr.open("GET", file.uri, true);
      xhr.send(null);
    });

    // Max= 1 GB
    // const maxAllowedSize = 1 * 1024 * 1024 *1024;
    // if (e.target.files[0].size > maxAllowedSize) {

    //   alert("K??ch th?????c file v?????t qu?? 1 GB");
    //    return false;
    // }

    // console.log(e.target.files[0].type)
    setIsLoading(true);
    const filed = file.uri.slice(file.uri.lastIndexOf('.') + 1, file.uri.length);
    const fileName = file.uri.slice(file.uri.lastIndexOf('/') + 1, file.uri.lastIndexOf('.')) + "-" + Date.now()+"."+filed;
    const fileRef = ref(storage, `/files/${fileName}`);

    uploadBytes(fileRef, blob)
      .then(() => {
        getDownloadURL(fileRef)
          .then(async (url) => {

            messageFile.text = url
            setIsLoading(false);
            console.log(url)

            const receiverIds = [];

            for (let index = 0; index < currentChat.members.length; index++) {
              if (currentChat.members[index] !== userInfo._id) {
                receiverIds.push(currentChat.members[index]);
              }
            }

            try {
              const res = await axios.post(`${Url}/api/messages`, messageFile);
              // setMessages([...messages, res.data]);
              socket.current.emit("sendMessage", {
                _id: res.data._id,
                senderId: userInfo._id,
                receiverIds,
                type: file.mimeType.match('image') ? 1 : file.mimeType.match('video') ? 2 : 3,
                text: messageFile.text,
                conversationId: currentChat._id,
                reCall: false,
                delUser: "",
                date: Date.now(),
                username: userInfo.username,
                avt: userInfo.avt,
              });

              socket.current.emit("sendStatus", {
                senderId: userInfo._id,
                username: userInfo.username,
                receiverIds: currentChat.members,
                type: file.mimeType.match('image') ? 1 : file.mimeType.match('video') ? 2 : 3,
                text: messageFile.text,
                conversationId: currentChat._id,
                delUser: "",
                date: Date.now(),

              })

            } catch (err) {
              console.log(err);
            }


          })
          .catch((error) => {
            console.log(error.message, "error getting the file url");
          });

      })
      .catch((error) => {
        console.log(error.message);
      });
  };

  return (
    <SafeAreaView style={{ height: '100%' }}>
      <View style={styles.Header}>
        <TouchableOpacity
          onPress={() => navigation.navigate('HomeNavigator')}>
          <Ionicons
            name='arrow-back'
            size={25}
            color='#fff'
          />
        </TouchableOpacity>
        <View style={styles.Name}>
          <Text style={styles.text_Name}>{currentChat.name ? mess(currentChat.name) : mess(user.username)}</Text>
          <Text style={styles.active}>{currentChat.name ? Nmember + ' th??nh vi??n' : getOnline()}</Text>
        </View>
        <TouchableOpacity>
          <Ionicons
            name='call-outline'
            size={25}
            color='#fff' />
        </TouchableOpacity>
        <TouchableOpacity>
          <Ionicons
            name='videocam-outline'
            size={25}
            color='#fff' />
        </TouchableOpacity>
        <TouchableOpacity onPress={() => navigation.navigate('MoreInfo')}>
          <Ionicons
            name='list-outline'
            size={25}
            color='#fff' />
        </TouchableOpacity>
      </View>
      <View style={styles.MessageList}>
        <ScrollView
          ref={scrollView_ref}
          onContentSizeChange={() => scrollView_ref.current.scrollToEnd({ animated: false })}>
          <KeyboardAwareScrollView onKeyboardDidShow={() => scrollView_ref.current.scrollToEnd({ animated: false })}>
            {messages.map((m) => (
              <Messager
                key={m._id}
                message={m}
                own={m.sender === userInfo._id}
                userId={userInfo._id}
                onClickDelete={onClickDeleteMgs}
                onClickDeleteMgsUser={onClickDeleteMgsMy}
                onClickDeleteMgsFri={onClickDeleteMgsOfFri}
              />))}
          </KeyboardAwareScrollView>
        </ScrollView>
      </View>
      <View style={styles.input}>
        <View style={{ width: '10%', justifyContent: 'center', alignItems: 'center' }}>
          <TouchableOpacity >
            <Ionicons
              name='happy-outline'
              size={25} />
          </TouchableOpacity>
        </View>
        <TextInput style={styles.input_text}
          placeholder='Nh???p tin nh???n'
          value={newMessage}
          onChangeText={(value) => setNewMessage(value)} />
        {newMessage ?
          <View style={{ width: '18%', alignItems: 'center', }}>
            <TouchableOpacity
              onPress={() => {
                sendSubmit();
                setNewMessage("");
              }}>
              <Ionicons
                name='send'
                size={25}
                color={'#056282'} />
            </TouchableOpacity>
          </View> :
          <View style={{ flexDirection: 'row', width: '18%', alignItems: 'center', justifyContent: 'space-around', paddingHorizontal: 5 }}>
            <TouchableOpacity
              onPress={() => showFilePicker()}>
              <Ionicons
                name='attach'
                size={25} />
            </TouchableOpacity>
            <TouchableOpacity
              onPress={() => setModalVisible(true)}>
              <Ionicons
                name='images-outline'
                size={25} />
            </TouchableOpacity>
            <Modal
              visible={modalVisible}
              transparent={true}
              onRequestClose={() => setModalVisible(false)}
              animationType='fade'
              hardwareAccelerated>
              <TouchableWithoutFeedback onPress={() => setModalVisible(false)}>
                <View style={styles.centered_view} >
                  <View style={styles.modal_cont}>
                    <Text style={styles.modal_title}>G???i h??nh ???nh</Text>
                    <View style={styles.modal_body}>
                      <TouchableOpacity
                        onPress={() => openCamera()}
                        style={styles.choose}>
                        <Ionicons name='camera-outline' size={26} color={'#056282'} />
                        <Text style={styles.text_choose}>Ch???p ???nh m???i</Text>
                      </TouchableOpacity>
                      <TouchableOpacity
                        onPress={() => showImagePicker()}
                        style={styles.choose}>
                        <Ionicons name='images-outline' size={26} color={'#056282'} />
                        <Text style={styles.text_choose}>Ch???n ???nh t??? thi???t b???</Text>
                      </TouchableOpacity>
                      <TouchableOpacity
                        onPress={() => setModalVisible(false)}
                        style={styles.choose}>
                        <Ionicons name='close-circle-outline' size={26} color={'#056282'} />
                        <Text style={styles.text_choose}>H???y</Text>
                      </TouchableOpacity>
                    </View>
                  </View>
                </View>
              </TouchableWithoutFeedback>
            </Modal>
          </View>
        }
      </View>
      <Modal
        visible={isLoading}
        transparent={true}
        animationType='none'
        hardwareAccelerated>
        <View style={styles.centered_view2} >
          <Text
            style={{
              fontSize:16,
              color:'#fff',
            }}>Uploading...</Text>
          <ActivityIndicator size={'large'}/>
        </View>
      </Modal>
    </SafeAreaView>

  )
}

const styles = StyleSheet.create({
  Header: {
    display: 'flex',
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    backgroundColor: '#056282',
    padding: 10,
  },
  text_Name: {
    color: '#fff',
    fontSize: 16,
    fontWeight: '500',
  },
  active: {
    color: "#fff",
    fontSize: 12,
    fontWeight: '300'
  },
  Name: {
    width: 200,
  },
  MessageList: {
    flex: 1,
  },
  input: {
    display: 'flex',
    flexDirection: 'row',
    backgroundColor: "#fff",
    paddingVertical: 10,
    justifyContent: 'center',
    alignItems: 'center',
    height: 60,
  },
  input_text: {
    width: '72%',
    height: 50,
    maxHeight: 100,
    fontSize: 16,
  },
  //modal
  centered_view: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: '#00000099',
  },
  modal_cont: {
    width: 300,
    backgroundColor: '#ffffff',
    borderRadius: 5,
  },
  modal_title: {
    borderBottomWidth: 1,
    borderBottomColor: '#D0D4D3',
    padding: 10,
    fontSize: 20,
    fontWeight: '500',
  },
  modal_body: {
    padding: 20,
  },
  choose: {
    height: 50,
    justifyContent: 'flex-start',
    alignItems: 'center',
    flexDirection: 'row',
  },
  text_choose: {
    marginLeft: 15,
    fontSize: 16,
  },
  centered_view2: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: '#00000099',
  },
})