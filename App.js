import React, { useState, useEffect } from 'react';
import { Text, View, StatusBar, TouchableOpacity, TouchableWithoutFeedback, ActivityIndicator, Image, Linking, SafeAreaView, Platform } from 'react-native';
import Navigator from './Navigator';
import Switch from './layouts/Switch';
import ProfileSetup from './layouts/ProfileSetup';
import EmailSignIn from './layouts/EmailSignIn';
import Browser from './layouts/Browser';
import ErrorBoundary from './ErrorBoundary';

import Svg, { Path, Line, Circle, Polyline, Rect } from 'react-native-svg';

import * as Font from 'expo-font';
import * as AppleAuthentication from 'expo-apple-authentication';
import * as GoogleSignIn from 'expo-google-sign-in';
import * as Localization from 'expo-localization';
import * as ScreenOrientation from 'expo-screen-orientation';

import API from './api';
import makeid from './js/makeid';

TouchableOpacity.defaultProps = TouchableOpacity.defaultProps || {};
TouchableOpacity.defaultProps.delayPressIn = 0;
TouchableWithoutFeedback.defaultProps = TouchableWithoutFeedback.defaultProps || {};
TouchableWithoutFeedback.defaultProps.delayPressIn = 0;

export default function App() {
  const [screen, setScreen] = useState("loading");
  const [moreSignin, setMoreSignin] = useState(false);
  const [activity, setActivity] = useState(false);
  const [premium, setPremium] = useState(API.premium);

  useEffect(() => {
    API.event.on("premium", () => {
      console.log("$$$$$", API.premium);
      setPremium(API.premium);
    });

    setTimeout(() => {
      if(screen === "loading"){
        setScreen("login");
      }
    }, 5000);
    
    checkIdentifier();
    
    if (Platform.OS !== 'web') {
      ScreenOrientation.unlockAsync();
    }

    API.event.on("refresh", (type) => {
      if(type === "signout"){
        setScreen("login");
      }
    });
  }, []);

  const checkIdentifier = async (providedIdentifier) => {
    let identifier = providedIdentifier;
    if(!identifier){
      identifier = await API.getIdentifier();
    }

    if(identifier !== ""){
      let user = await API.signIn(identifier);
      console.log("Already exists: ", user.language);
      if(user.language){
        setScreen("logged");
      }else{
        setScreen("login");
      }
    }else{
      setScreen("login");
    }
  };

  const signInWithApple = async () => {
    try {
      setActivity(true);

      const credential = await AppleAuthentication.signInAsync({
        requestedScopes: [
          AppleAuthentication.AppleAuthenticationScope.FULL_NAME,
          AppleAuthentication.AppleAuthenticationScope.EMAIL,
        ],
      });
      let user = await API.signIn(credential.user, "apple", credential);
      API.setData("identifier", credential.user);

      setScreen("logged");
      setActivity(false);

    } catch (e) {
      if (e.code === 'ERR_CANCELED') {
        setActivity(false);
      } else {
        alert('Make sure to have internet connection and try again later:' + JSON.stringify(e));
        setActivity(false);
      }
    }
  };

  const signInWithGoogle = async () => {
    try {
      setActivity(true);
      let asdas = await GoogleSignIn.initAsync({
        clientId: '494587339451-56jbil93dcoif248evnj52sff1p4b3ca.apps.googleusercontent.com',
      });
      console.log("asdasd",asdas);
      await GoogleSignIn.askForPlayServicesAsync();
      const { type, user } = await GoogleSignIn.signInAsync();
      if (type === 'success') {
        const credential = await GoogleSignIn.signInSilentlyAsync();
        let user = await API.signIn(credential.uid, "google", credential);
        API.setData("identifier", credential.uid);

        setScreen("logged");
        setActivity(false);
      }
    } catch ({ message }) {
      console.log(message);
      alert('Make sure to have internet connection and try again later:' + message);
      setActivity(false);
    }
  };

  const signInWithEmail = () => {
    setScreen("email");
    API.event.on("authIdentifier", (identifier) => {
      checkIdentifier(identifier);
      API.setData("identifier", identifier);
    });
  };

  const setCurrentProfile = (id) => {
    if(id){
      API.setCurrentProfile(id);
    }else{
      API.getCurrentProfile().then(profile => {
        if(profile){
          API.setCurrentProfile(profile.id);
        }else{
          API.setCurrentProfile(API.user.profiles[0].id);
        }
      });
    }
  };

  const getStarted = async () => {
    setScreen("loading");
    let pass = makeid(10);
    let email = pass + "@leeloo.com";
    let identifier = await API.getAuthIdentifier(email, pass);
    await API.signIn(identifier, "email", {email: email});

    checkIdentifier(identifier);
    API.setData("identifier", identifier);
  };

  if(screen === "loading"){
    return (
      <View style={{flex: 1, backgroundColor: "#6989FF", alignItems: "center", justifyContent: "center"}}>
        <Image source={require('./assets/icon.png')} style={{width: 100, height: 100, marginBottom: 20}}/>
        <ActivityIndicator color={"#fff"} size={"large"}/>
      </View>
    );
  }else if(screen === "login"){
    return (
      <View style={{flex: 1, backgroundColor: "#6989FF"}}>
        <SafeAreaView style={{flex: 1}}>
          <View style={{flex: 1, alignItems: "center", justifyContent: "center"}}>
            <Image source={require('./assets/icon.png')} style={{width: 100, height: 100, marginBottom: 20}}/>
            <Text style={{color: "rgba(255,255,255,0.9)", fontSize: 24, fontWeight: "bold", marginBottom: 10}}>Leeloo</Text>
            <Text style={{color: "rgba(255,255,255,0.9)", fontSize: 16, marginBottom: 40, textAlign: "center", paddingHorizontal: 40}}>{API.t("setup_description")}</Text>
            
            {Platform.OS === 'web' ? (
              <TouchableOpacity
                style={{ width: 240, height: 46, alignItems: "center", borderRadius: 25, backgroundColor: "#fff", justifyContent: "center", flexDirection: "row", marginTop: 10}}
                onPress={getStarted}>
                <Svg height={18} width={18} viewBox="0 0 24 24" style={{marginRight: 5}} strokeWidth="2" stroke="#333" fill="none" strokeLinecap="round" strokeLinejoin="round">
                  <Path fill={"transparent"} d="M12 17.75l-6.172 3.245 1.179-6.873-4.993-4.867 6.9-1.002L12 2l3.086 6.253 6.9 1.002-4.993 4.867 1.179 6.873z"/>
                </Svg>
                <Text style={{fontSize: 19, fontWeight: "500", color: "#333"}}>{API.t("get_started")}</Text>
              </TouchableOpacity>
            ) : (
              Platform.OS === "ios" ? (
                <>
                  <AppleAuthentication.AppleAuthenticationButton
                    buttonType={AppleAuthentication.AppleAuthenticationButtonType.SIGN_IN}
                    buttonStyle={AppleAuthentication.AppleAuthenticationButtonStyle.WHITE}
                    cornerRadius={25}
                    style={{ width: 240, height: 50, borderRadius: 25 }}
                    onPress={signInWithApple}
                  />
                  <TouchableOpacity onPress={() => setMoreSignin(true)}>
                    <Text style={{color: "rgba(255,255,255,0.9)", marginTop: 18.5, marginBottom: 20}}>{API.t("setup_other_options")}</Text>
                  </TouchableOpacity>
                </>
              ) : (
                <TouchableOpacity
                  style={{ width: 240, height: 46, alignItems: "center", borderRadius: 25, backgroundColor: "#fff", justifyContent: "center", flexDirection: "row", marginTop: 10}}
                  onPress={getStarted}>
                  <Svg height={18} width={18} viewBox="0 0 24 24" style={{marginRight: 5}} strokeWidth="2" stroke="#333" fill="none" strokeLinecap="round" strokeLinejoin="round">
                    <Path fill={"transparent"} d="M12 17.75l-6.172 3.245 1.179-6.873-4.993-4.867 6.9-1.002L12 2l3.086 6.253 6.9 1.002-4.993 4.867 1.179 6.873z"/>
                  </Svg>
                  <Text style={{fontSize: 19, fontWeight: "500", color: "#333"}}>{API.t("get_started")}</Text>
                </TouchableOpacity>
              )
            )}
          </View>
        </SafeAreaView>
      </View>
    );
  }else if(screen === "policy"){
    return (<Browser link={"https://dreamoriented.org/privacypolicy_textonly"} back={() => setScreen("login")}/>);
  }else if(screen === "email"){
    return (<EmailSignIn back={() => setScreen("login")}/>);
  }else if(screen === "logged"){
    if(API.user.active_profile === "noprofile"){
      return (<ProfileSetup done={setCurrentProfile}/>);
    }else if(API.user.active_profile === "multiple"){
      return (<Switch onChoose={setCurrentProfile}/>);
    }else if(API.user.active_profile){
      if(premium === "determining"){
        return (
          <View style={{flex: 1}}>
            <StatusBar backgroundColor="#ffffff" barStyle={"dark-content"} />
            <Navigator/>
          </View>
        );
      }else{
        return (
          <View style={{flex: 1}}>
            <StatusBar backgroundColor="#ffffff" barStyle={"dark-content"} />
            <Navigator/>
          </View>
        );
      }
    }else{
      return (<ProfileSetup done={setCurrentProfile}/>);
    }
  }else{
    return (
      <ErrorBoundary>
        <Navigator/>
      </ErrorBoundary>
    )
  }
}
