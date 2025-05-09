import Storage from 'react-native-storage';

import { AsyncStorage, Platform, Alert } from 'react-native';

import Speech from 'react-native-tts';
import * as Localization from 'expo-localization';
import * as Haptics from 'expo-haptics';
import * as Permissions from 'expo-permissions';
import * as Device from 'expo-device';
import * as InAppPurchases from 'expo-in-app-purchases';
import * as Notifications from 'expo-notifications';

import { Analytics, ScreenHit, Event as Avent } from 'expo-analytics-safe';
import { CacheManager } from "react-native-expo-image-cache";
import Constants from 'expo-constants';
import NetInfo from '@react-native-community/netinfo';

import makeid from './js/makeid';
import Event from './js/event';
import styles from './js/styles';
import themes from './js/themes';
import uitext from './uitext';

const APP = require("./app.json");
// For test cases
const _DEVELOPMENT = false;

const _NETWORK_STATUS = true;
const _FLUSH = false;
const _DEVUSERIDENTIFIER = "109677539152659927717";
const _DEVLOCALE = "en-US";
const _ISPREMIUM = false;

// API Configuration
const IS_DEVELOPMENT = process.env.NODE_ENV === 'development';
const IS_WEB = Platform.OS === 'web';

const API_BASE_URL = IS_DEVELOPMENT 
  ? 'http://localhost:3000'  // Local API
  : 'https://api.assistivecards.com';  // Production API

const API_ENDPOINT = IS_DEVELOPMENT 
  ? 'http://localhost:3000/' 
  : 'https://leeloo.dreamoriented.org/';

const ASSET_ENDPOINT = IS_DEVELOPMENT 
  ? 'http://localhost:3000/assets/' 
  : 'https://api.assistivecards.com/';

const ANALYTICS_KEY = 'UA-110111146-1';
const ASSET_VERSION = 275;
const APP_VERSION = "2.7.5";
const RTL = ["ar","ur","he"];

const API_URL = 'https://translation.googleapis.com/language/translate/v2';

let storage;

if (Platform.OS === 'web') {
  // Web storage implementation
  const webStorage = {
    async save({ key, data }) {
      localStorage.setItem(key, JSON.stringify(data));
    },
    async load({ key }) {
      const data = localStorage.getItem(key);
      return data ? JSON.parse(data) : null;
    },
    async remove({ key }) {
      localStorage.removeItem(key);
    },
    async clear() {
      localStorage.clear();
    }
  };
  storage = webStorage;
} else {
  // Native storage implementation
  storage = new Storage({
    size: 1000,
    storageBackend: AsyncStorage,
    defaultExpires: null,
    enableCache: true,
    sync: {}
  });
}

class Api {
  constructor(){
		if(_DEVELOPMENT && _FLUSH){
			AsyncStorage.clear();
			CacheManager.clearCache();
		}

		//this.test();
		this.cards = {};
		this.searchArray = [];
		this.development = _DEVELOPMENT;
		this.styles = styles;

		this.setSpeechEngine();

		if(_DEVELOPMENT){
			this.analytics = new Analytics("DEVELOPMENT", {slug: "leeloo", name: "Leeloo", version: APP_VERSION});
		}else{
			this.analytics = new Analytics(ANALYTICS_KEY, {slug: "leeloo", name: "Leeloo", version: APP_VERSION});
		}
		this.isTablet = false;
		this._checkIfTablet();

		this.config = APP.config;
		this.config.theme = themes.light;

		this.version = ASSET_VERSION;
		this.apiBaseUrl = API_BASE_URL;
		this.apiEndpoint = API_ENDPOINT;
		this.assetEndpoint = ASSET_ENDPOINT;

		this.event = Event;
		if(_DEVELOPMENT){
			this.isOnline = _NETWORK_STATUS;
		}else{
			this.isOnline = true;
		}

		this.locked = true;
		this.activeProfileId = null;
		this.premium = "determining";
		this.premiumPlans = [];

    console.log("API: Created instance");
		if(!_DEVELOPMENT){
			this._listenNetwork();
		}
		this._initSubscriptions();
  }

	isRTL(){
		if(this.user.language){
			return RTL.includes(this.user.language);
		}else{
			return false;
		}
	}

	requestSpeechInstall(){
		if(Platform.OS == "android"){
			Speech.getInitStatus().then(() => {
				Speech.requestInstallData();
			}, (err) => {
			  if (err.code === 'no_engine') {
					Speech.requestInstallEngine();
			  }
			});
		}
	}

	setSpeechEngine(){
		if(Platform.OS == "android"){
			Speech.engines().then(engines => {
				engines.forEach(engine => {
					if(engine.label){
						if(engine.label.includes("Google") || engine.label.includes("google") || engine.label.includes("google")){
							if(!engine.default){
								Speech.setDefaultEngine(engine.name);
							}
						}
					}
				});
			});
		}
	}

	initSpeech(){
		console.log("Speech Initialized");

		Speech.setDefaultVoice(this.user.voice).then(res => {
			console.log(res);
		}, (err) => {
		  console.log("Error: ", err);
		});
		Speech.setIgnoreSilentSwitch("ignore");
		Speech.setDucking(true);
		Speech.addEventListener('tts-start', () => {});
		Speech.addEventListener('tts-finish', () => {});
		Speech.addEventListener('tts-cancel', () => {});
	}

	hit(screen){
		this.analytics.hit(new ScreenHit(screen))
		  .then(() => {
				// hit done
			})
		  .catch(e => console.log(e.message));
	}

	avent(a,b,c){
		// Analytic Event, nice abbr, right?
		this.analytics.event(new Avent(a, b, c))
	}

	_listenNetwork(){
		NetInfo.addEventListener(state => {
		  console.log('Connection type', state.type);
		  console.log('Is connected?', state.isConnected);
			this.isOnline = state.isConnected;
		});
	}

	async _checkIfTablet(){
		let deviceType = await Device.getDeviceTypeAsync()

		this.isTablet = deviceType == Device.DeviceType.TABLET;
	}

	isPremium(){
		if(_DEVELOPMENT){
			return _ISPREMIUM;
		}
		if(this.user.premium == "lifetime"){
			return true;
		}

		if(this.premium == "lifetime" || this.premium == "yearly" || this.premium == "monthly"){
			return true;
		}else{
			if(this.isGift){
				return true;
			}else{
				return false;
			}
		}
	}

	haptics(style){
		if(this.user.haptic !== "0"){
			switch (style) {
				case "touch":
					Haptics.selectionAsync()
					break;
				case "impact":
					Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium)
					break;
				default:
					Haptics.selectionAsync()
			}
		}
	}

	async registerForPushNotificationsAsync(){
    if(Constants.isDevice) {
			await Notifications.requestPermissionsAsync({
	      ios: {
	        allowAlert: true,
	        allowBadge: true,
	        allowSound: true,
	        allowAnnouncements: true,
	      },
	    });

	    let experienceId = undefined;
	    if (!Constants.manifest) {
	      // Absence of the manifest means we're in bare workflow
	      experienceId = '@burak/leeloo';
	    }

	    const expoPushToken = await Notifications.getExpoPushTokenAsync({
	      experienceId,
	    });

		  let token = expoPushToken.data;

	    this.scheduleNotif();

			if(token != this.user.notificationToken){
				await this.update(["notificationToken"], [token]);
			}
			return token;

    }else{
      console.log('Must use physical device for Push Notifications');
			return "";
    }
  }

  async scheduleNotif(){
    let scheduledNotifs = await Notifications.getAllScheduledNotificationsAsync();
    if(scheduledNotifs.length == 0){

      let content = {
        sound: 'default',
        title: this.t("setup_notification_badge_title"),
        body: this.t("setup_notification_badge_description"),
      };

      Notifications.scheduleNotificationAsync({
        content: content,
        trigger: {
          seconds: 60*60*24*3, // 2 days = 60*60*24*2
          repeats: true
        },
      });
    }
  }

	async signIn(identifier, type, user){
    var url = API_ENDPOINT + "user/";
    var formData = new FormData();
		formData.append('identifier', identifier);

		let localIdentifier = await this.getData("identifier");
		let localUserString = await this.getData("user");
		let registerAgain = false;
		let localUser;
		if(localUserString){
			localUser = JSON.parse(localUserString);
			if(localUser.identifier){
				if(!localUser.language){
					registerAgain = true;
				}
			}
		}

		if(localIdentifier != identifier || registerAgain){

			let deviceLanguage = Localization.locale.substr(0,2);
			let bestTTS = await this.getBestAvailableVoiceDriver(deviceLanguage);
			formData.append('type', type);
			formData.append('language', Localization.locale.substr(0,2));
			formData.append('voice', bestTTS.identifier);
			formData.append('os', Platform.OS);
			formData.append('modelName', Device.modelName);
			formData.append('timeline', Localization.timezone);

			if(type == "apple"){
				formData.append('email', user.email);
				formData.append('name', user.fullName.givenName + " " +user.fullName.familyName);

			}else if(type == "google"){
				formData.append('email', user.email);
				formData.append('name', user.displayName);
				formData.append('avatar', user.photoURL);
			}else if(type == "email"){
				formData.append('email', user.email);
			}
		}

		let userResponse;

		let userLocalString = await this.getData("user") || "{}";
		let userLocal = JSON.parse(userLocalString);

		try {
			userResponse = await fetch(url, { method: 'POST', body: formData })
	    .then(res => res.json());

			userResponse.profiles.forEach((profile, i) => {
				userResponse.profiles[i].packs = JSON.parse(profile.packs);
			});

			await this.setData("user", JSON.stringify(userResponse));


		} catch(error){
			console.log("Offline, Falling back to cached userdata!", error);
			let userResponseString = await this.getData("user");
			if(userResponseString){
				userResponse = JSON.parse(userResponseString);
			}
		}

		this.user = userResponse;
		this.user.greeding = userLocal.greeding;

		if(this.user.premium == "gift"){
			this.isGift = true;
		}
		this.user.active_profile = await this.getCurrentProfile();
		this.initSpeech();
		return userResponse;
	}

  signout(){
    Alert.alert(
      this.t("alert_signout_title"),
      this.t("alert_signout_description"),
      [
        {
          text: this.t("alert_cancel"),
          onPress: () => console.log("Cancel Pressed"),
          style: "cancel"
        },
        { text: this.t("alert_ok"), onPress: () => {
					AsyncStorage.clear();
					this.event.emit("refresh", "signout");
				} }
      ],
      { cancelable: true }
    );
  }

	async update(fields, values){
		if(this.user.identifier){
	    var url = API_ENDPOINT + "update/";
	    var formData = new FormData();
			formData.append('identifier', this.user.identifier);

			for (var i = 0; i < fields.length; i++) {
				formData.append(fields[i], values[i]);
			}

			try {
				let userResponse = await fetch(url, { method: 'POST', body: formData })
		    .then(res => res.json());

				this.user = userResponse;

				if(fields[0] == "greeding"){
					this.user.greeding = values[0];
				}

				await this.setData("user", JSON.stringify(this.user));


				console.log(userResponse);

				userResponse.profiles.forEach((profile, i) => {
					userResponse.profiles[i].packs = JSON.parse(profile.packs);
				});


				if(this.user.premium == "gift"){
					this.isGift = true;
				}
				this.user.active_profile = await this.getCurrentProfile();
			} catch(error){
				alert("Please check your internet connectivity!");
			}

			this.event.emit("refresh");

			return true;
		}
	}

	async newProfile(profile){
		if(this.user.identifier && profile.name){
	    var url = API_ENDPOINT + "profile/";
	    var formData = new FormData();
			formData.append('identifier', this.user.identifier);
			formData.append('name', profile.name);
			formData.append('avatar', profile.avatar);
			formData.append('packs', `["conversation","people","feelings","food","animals","school","activities","shapes","colors"]`);

			try {
				let newProfileResponse = await fetch(url, { method: 'POST', body: formData })
		    .then(res => res.json());

				newProfileResponse.packs = JSON.parse(newProfileResponse.packs);

				this.user.profiles.push(newProfileResponse);

				await this.setData("user", JSON.stringify(this.user));

				this.user.active_profile = await this.getCurrentProfile();
			} catch(error){
				console.log("Please check your internet connectivity!", error);
				alert("Please check your internet connectivity!");
			}

			this.event.emit("refresh");

			return true;
		}
	}

	async updateProfile(profileId, fields, values){
		if(this.user.identifier && profileId){
	    var url = API_ENDPOINT + "profile/update/";
	    var formData = new FormData();
			formData.append('id', profileId);
			formData.append('identifier', this.user.identifier);

			for (var i = 0; i < fields.length; i++) {
				formData.append(fields[i], values[i]);
			}

			try {
				let profileResponse = await fetch(url, { method: 'POST', body: formData })
		    .then(res => res.json());

				profileResponse.packs = JSON.parse(profileResponse.packs);

				for (var i in this.user.profiles) {
					if (this.user.profiles[i].id == profileId) {
						this.user.profiles[i] = profileResponse;
						break;
					}
				}

				await this.setData("user", JSON.stringify(this.user));

				this.user.active_profile = await this.getCurrentProfile();
			} catch(error){
				console.log(error);
				alert("Please check your internet connectivity!");
			}

			this.event.emit("refresh");

			return true;
		}
	}

	async removeProfile(profileId){
		if(this.user.identifier && profileId){
	    var url = API_ENDPOINT + "profile/remove/";
	    var formData = new FormData();
			formData.append('id', profileId);
			formData.append('identifier', this.user.identifier);

			try {
				let profileResponse = await fetch(url, { method: 'POST', body: formData })
		    .then(res => res.json());
				console.log(profileResponse);
				if(profileResponse == "deleted"){

					this.user.profiles = this.user.profiles.filter(profile => profile.id != profileId);
					await this.setData("user", JSON.stringify(this.user));

				}else{
					alert("A problem occured while trying to remove profile.");
				}
				this.user.active_profile = await this.getCurrentProfile();
			} catch(error){
				alert("Please check your internet connectivity!");
			}

			this.event.emit("refresh");

			return true;
		}
	}

	async removeData(){
		if(this.user.identifier){
	    var url = API_ENDPOINT + "profile/remove/?account=true";
	    var formData = new FormData();
			formData.append('identifier', this.user.identifier);

			try {
				let profileResponse = await fetch(url, { method: 'POST', body: formData })
		    .then(res => res.json());
				console.log(profileResponse);
				if(profileResponse == "deleted"){

					// deleted

				}else{
					alert("A problem occured while trying to remove your data.");
				}
			} catch(error){
				alert("Please check your internet connectivity!");
			}

			this.event.emit("refresh");

			return true;
		}
	}

	async getCurrentProfile(){
		if(this.user){
			let profiles = this.user.profiles;
			if(this.activeProfileId){
				return profiles.find(profile => profile.id == this.activeProfileId);
			}else{
				if(profiles.length == 1){
					let profile = profiles[0];
					this.activeProfileId = profile.id;
					return profile;
				}else if(profiles.length == 0){
					return "noprofile";
				}else{
					return "multiple";
				}
			}
		}else{
			return "nouser";
		}
	}

	async setCurrentProfile(profileId){
		if(this.user){
			let profiles = this.user.profiles;
			this.activeProfileId = profileId;
			this.user.active_profile = profiles.find(profile => profile.id == profileId);
			this.event.emit("refresh");
		}
	}


	async getAuthIdentifier(email, pass){
		if(email && pass){
	    var url = API_ENDPOINT + "auth/";
	    var formData = new FormData();
			formData.append('email', email);
			formData.append('pass', pass);

			let identifier = null;

			try {
				let authIdentifierResponse = await fetch(url, { method: 'POST', body: formData })
		    .then(res => res.json());

				identifier = authIdentifierResponse.identifier;
			} catch(error){
				console.log("Please check your internet connectivity!", error);
				alert("Please check your internet connectivity!");
			}

			return identifier;
		}
	}


	speak(text, speed, voice){
		if(voice){
			Speech.setDefaultVoice(voice);
		}
		//text = this.phrase()
		let rate = 0.5;
		if(speed == "slow"){
			rate = 0.25;
		}
		if(this.user.voice != "unsupported"){
			Speech.speak(text, {
				language: this.user.language,
				pitch: 1,
				rate: rate,
				androidParams: {
					KEY_PARAM_STREAM: 'STREAM_MUSIC'
				}
			});
		}
	}

	async getAvailableVoicesAsync(recall){
		let voices = await Speech.voices();
		voices = voices.filter(voice => !voice.id.includes("synthesis") && !voice.id.includes("eloquence"));
		if(voices.length == 0){
			if(recall){
				return [];
			}else{
				await new Promise(function(resolve) {
		        setTimeout(resolve, 8000);
		    });
				return await this.getAvailableVoicesAsync(true);
			}
		}else{
			voices.map(voice => {
				voice.name = voice.id;
				voice.identifier = voice.id;
				voice.quality == 500 ? voice.quality = "Enhanced" : voice.quality = "Optimal";
			});
			return voices;
		}
	}

	async getBestAvailableVoiceDriver(language){
		let allVoices = await this.getAvailableVoicesAsync();
		let voices = allVoices.filter(voice => voice.language.includes(language));

		if(voices.length == 0){
			return "unsupported";
		}else if(voices.length == 1){
			return voices[0];
		}else if(voices.length > 1){
			let localeString = this.localeString().toLowerCase().replace(/_/g, "-");
			let localeVoices = voices.filter(voice => localeString.includes(voice.language.toLowerCase().replace(/_/g, "-")));

			if(localeVoices.length == 0){
				// check if there is an enhanced one
				return voices.sort((a, b) => {
	          let aQ = !(a.quality == "Enhanced");
	          let bQ = !(b.quality == "Enhanced");
	          if (aQ < bQ) return -1
	          if (aQ > bQ) return 1
	          return 0
	      })[0];
			}else if(localeVoices.length == 1){
				return localeVoices[0];
			}else if(localeVoices.length > 1){
				// check if there is an enhanced one
				return localeVoices.sort((a, b) => {
	          let aQ = !(a.quality == "Enhanced");
	          let bQ = !(b.quality == "Enhanced");
	          if (aQ < bQ) return -1
	          if (aQ > bQ) return 1
	          return 0
	      })[0];
			}
		}
	}

	async getPacks(force){
		var url = ASSET_ENDPOINT + "packs/" + this.user.language + "/metadata.json?v="+this.version;

		if(this.packs && force == null){
			console.log("pulling from ram");
			return this.packs;
		}else{
			let packsResponse;
			try {
				packsResponse = await fetch(url, {cache: "no-cache"})
		    .then(res => res.json());
				this.setData("packs", JSON.stringify(packsResponse));

			} catch(error){
				console.log("Offline, Falling back to cached packdata!", error);
				let packsResponseString = await this.getData("packs");
				if(packsResponseString){
					packsResponse = JSON.parse(packsResponseString);
				}
			}
			this.packs = packsResponse;
			return packsResponse;
		}
	}

	async getAllApps(){
		var url = ASSET_ENDPOINT + "apps/metadata.json?v="+this.version;
		let appsResponse = [];
		try {
			appsResponse = await fetch(url, {cache: "no-cache"})
			.then(res => res.json());
			appsResponse = appsResponse.apps;

			appsResponse.map(app => {
				app.tagline = app.tagline[this.user.language];
				app.description = app.description[this.user.language];
				return app;
			})

		} catch(error){
			console.log("Offline, Falling back to cached cardData!", error);
		}

		return appsResponse;
	}

	search(term){
		if(term.length >= 2){
			let results = [];
			for (var i = 0; i < this.searchArray.length; i++) {
				if(this.searchArray[i].search.includes(" "+term.toLocaleLowerCase())){
					results.push(this.searchArray[i]);
					if(results.length == 10){
						break;
					}
				}
			}
			return results;
		}else{
			return [];
		}
	}

	phrase(string){
		if(string.includes("{name}")){
			return string.replace("{name}", this.user.active_profile.name)
		}else{
			return string;
		}
	}

	async ramCards(slugArray, force){
		for (var i = 0; i < slugArray.length; i++) {
			await this.getCards(slugArray[i], force);
		}

		if(!this.isPremium()){
			let allPacks = await this.getPacks();
			slugArray = slugArray.map(slug => {
				if(!allPacks.filter(allpack => allpack.slug == slug)[0].premium){
					return slug;
				}
			}).filter(slug => slug != null);
		}


		this.searchArray = []; // empty the old search array.

		slugArray.forEach((packSlug, i) => {
			this.cards[packSlug].forEach((card, i) => {
				let color = this.packs.filter(pack => pack.slug == packSlug)[0].color;
				this.searchArray.push({pack: packSlug, color, search: " "+card.title.toLocaleLowerCase()+" ", slug: card.slug, emoji: null, title: card.title, type: 1});

				card.phrases.forEach((phrase, i) => {
					this.searchArray.push({pack: packSlug, search: " "+this.phrase(phrase.phrase).toLocaleLowerCase()+" ", slug: card.slug, emoji: phrase.type, title: this.phrase(phrase.phrase), type: 2});
				});
			});
		});

	}

	async _initSubscriptions(){
    try{
			if(_DEVELOPMENT){
				if(!_ISPREMIUM){
					this.premium = "none";
					this.event.emit("premium");
				}
			}

	    if(!Constants.isDevice) {
				this.premium = "none";
				this.event.emit("premium");
			}
			await InAppPurchases.connectAsync();

			InAppPurchases.setPurchaseListener(({ responseCode, results, errorCode }) => {
			  // Purchase was successful
			  if (responseCode === InAppPurchases.IAPResponseCode.OK) {
			    results.forEach(async (purchase) => {
			      if (!purchase.acknowledged) {
			        console.log(`Successfully purchased ${purchase.productId}`);
			        // Process transaction here and unlock content...

							this.premium = purchase.productId;

							let consume = (purchase.productId == "lifetime");
							console.log("Should I consume?", consume);
			        // Then when you're done
			        let resfinish = await InAppPurchases.finishTransactionAsync(purchase, consume);
							alert(`Successfully purchased ${purchase.productId}`);
							this.event.emit("premium");
							this.event.emit("premiumPurchase", this.premium);
							this.setData("premium", this.premium);
							this.event.emit("refresh");
			      }
			    });
			  }

			  // Else find out what went wrong
			  if (responseCode === InAppPurchases.IAPResponseCode.USER_CANCELED) {
			    console.log('User canceled the transaction');
			  } else if (responseCode === InAppPurchases.IAPResponseCode.DEFERRED) {
			    console.log('User does not have permissions to buy but requested parental approval (iOS only)');
			  } else {
			    console.warn(`Something went wrong with the purchase. Received errorCode ${responseCode}`);
			  }
			});

			const history = await InAppPurchases.getPurchaseHistoryAsync(Platform.OS == "ios");
			if (history.responseCode === InAppPurchases.IAPResponseCode.OK) {
			  // get to know if user is premium or npt.
				let lifetime = history.results.filter(res => res.productId == "lifetime")[0];
				if(lifetime){
					this.premium = "lifetime";
				}else{
					let orderedHistory = history.results.sort((a, b) => (a.purchaseTime > b.purchaseTime) ? 1 : -1);
					if(orderedHistory[0]){
						this.premium = orderedHistory[0].productId;
					}else{
						this.premium = "none";
					}
				}

				this.event.emit("premium");
				await this.setData("premium", this.premium);

				this.getPlans(); // async fetch the plans for later use.

			}else{
				console.log("#### Appstore status is not ok.");
				this.premium = await this.getData("premium");
				if(!this.premium) {
					this.premium = "none";
					this.setData("premium", "none");
				}
				this.event.emit("premium");
			}

    } catch(err){
      console.log("###### maybe no internet, or the app reloaded in dev mode", err);
			this.premium = await this.getData("premium");
			if(!this.premium) {
				this.premium = "none";
				this.setData("premium", "none");
			}
			this.event.emit("premium");
    }
	}

	async getPlans(){
		if(this.premiumPlans.length != 0){
			return this.premiumPlans;
		}else{
			try {
	      const { responseCode, results } = await InAppPurchases.getProductsAsync(["monthly", "yearly", "lifetime"]);
				console.log(results);
				if (responseCode === InAppPurchases.IAPResponseCode.OK) {
					this.premiumPlans = results;
				}
			}catch (err) {
				console.log("Issues with fetching products: ", err);
			}
			return this.premiumPlans;
		}
	}

	async purchasePremium(productId, oldProductId){
		if(oldProductId && oldProductId != "none"){
			await InAppPurchases.purchaseItemAsync(productId, oldProductId);
		}else{
			await InAppPurchases.purchaseItemAsync(productId);
		}
		this.avent("Premium", "PurchaseClick", productId);

	}

	async getCards(slug, force){
		if (!force && this.cards[slug]) {
			return this.cards[slug];
		}

		try {
			const response = await fetch(`${this.apiBaseUrl}/cards/${slug}`);
			if (!response.ok) {
				throw new Error(`HTTP error! status: ${response.status}`);
			}
			const data = await response.json();
			this.cards[slug] = data;
			return data;
		} catch (error) {
			console.error('Error fetching cards:', error);
			throw error;
		}
	}

	getCardData(slug, pack){
		console.log(slug, pack);
		return this.cards[pack].filter(ramCard => ramCard.slug == slug)[0];
	}

	async getFavorites(){
		if(this.favorites){
			return this.favorites;
		}else{
			let favoriteText = await this.getData("favorites");
			if(favoriteText){
				this.favorites = JSON.parse(favoriteText);
				return this.favorites;
			}else{
				return [];
			}
		}
	}

	async setFavorites(favorites){
		this.favorites = favorites;
		await this.setData("favorites", JSON.stringify(favorites));
	}

	async addFavorite(cardObject){
		let favorites = await this.getFavorites();
		favorites.push(cardObject);

		await this.setFavorites(favorites);
		return true;
	}

	async removeFavorite(cardObject){
		let favorites = await this.getFavorites();
		favorites = favorites.filter(f => f.slug != cardObject.slug);

		await this.setFavorites(favorites);
		return true;
	}

	async isFavorite(cardObject){
		let favorites = await this.getFavorites();
		return favorites.filter(f => f.slug == cardObject.slug).length != 0;
	}

	localeString(){
		if(_DEVELOPMENT){
			return _DEVLOCALE;
		}else{
			return Localization.locales.join("|");
		}
	}

	async getIdentifier(){
		if(_DEVELOPMENT && Platform.OS === 'android'){
			return _DEVUSERIDENTIFIER;
		}
		return await this.getData("identifier");
	}

	t(UITextIdentifier, variableArray){
		let lang = "en";
		if(this.user){
			lang = this.user.language ? this.user.language : Localization.locale.substr(0, 2);
		}else{
			lang = Localization.locale.substr(0, 2);
		}

		if(!uitext[lang + "_json"]){
			lang = "en";
		}

		if(typeof variableArray == "string" || typeof variableArray == "number"){
			let text = uitext[lang + "_json"][UITextIdentifier];
			if(text) return text.replace("$1", variableArray);
			return "UnSupportedIdentifier";
		}else if(typeof variableArray == "array"){
			let text = uitext[lang + "_json"][UITextIdentifier];
			if(text){
				variableArray.forEach((variable, i) => {
					let variableIdentifier = `${i+1}`;
				 	text = text.replace(variableIdentifier, variable);
				});
				return text;
			}else{
				return "UnSupportedIdentifier";
			}

		}else{
			let text = uitext[lang + "_json"][UITextIdentifier];
			if(text) return text;
			return "UnSupportedIdentifier";
		}
	}

	async test(){
		console.log("testig");
		let alts = await this.getAltPhrases();
		console.log(alts);

		//await this.addAltPhrase("transport", "skateboard", "I want a new skateboard.");
		alts = await this.getAltPhrases();
		console.log(alts);

		await this.removeAltPhrase("ppp", "ccc", "kkkk4");
		alts = await this.getAltPhrases();
		console.log(alts);
	}

	// Returns alt object array
	async getAltPhrases(packSlug, cardSlug){
		let altArray = await this.getData("alternateArray");
		if(!altArray) return [];

		let altArrayRendered = JSON.parse(altArray);
		if(packSlug || cardSlug){
			return altArrayRendered.filter(alt => alt.packSlug == packSlug && alt.cardSlug == cardSlug);
		}
		return altArrayRendered;
	}

	async addAltPhrase(packSlug, cardSlug, altText){
		let altArray = await this.getAltPhrases();
		if(!altArray) altArray = [];

		altArray.push({packSlug, cardSlug, altText});

		return this.setData("alternateArray", JSON.stringify(altArray));
	}

	async removeAltPhrase(packSlug, cardSlug, altText){
		let altArray = await this.getAltPhrases();
		let filteredArray = altArray.filter(alt => {
			return !(alt.packSlug == packSlug && alt.cardSlug == cardSlug && alt.altText == altText);
		});

		return this.setData("alternateArray", JSON.stringify(filteredArray));
	}


  setData(key, data){
		return storage.save({key, data});
  }

  async getData(key){
    // returns promise
		try {
			return await storage.load({key});
		} catch (error) {
			return "";
		}
  }

	// Add new method for fetching cards
	async fetchCards(category) {
		try {
			const response = await fetch(`${this.apiBaseUrl}/cards/${category}`);
			if (!response.ok) {
				throw new Error(`HTTP error! status: ${response.status}`);
			}
			return await response.json();
		} catch (error) {
			console.error('Error fetching cards:', error);
			throw error;
		}
	}
}

const _api = new Api();
export default _api;

export const translate = async (text, targetLanguage) => {
  try {
    const response = await fetch(`${API_URL}?key=${process.env.EXPO_PUBLIC_GOOGLE_TRANSLATE_API_KEY}`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        q: text,
        target: targetLanguage,
      }),
    });

    if (!response.ok) {
      throw new Error('Translation request failed');
    }

    const data = await response.json();
    return data.data.translations[0].translatedText;
  } catch (error) {
    console.error('Translation API error:', error);
    throw error;
  }
};
