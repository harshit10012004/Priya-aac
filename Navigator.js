import { createAppContainer } from 'react-navigation';
import { createBottomTabNavigator } from 'react-navigation-tabs';
import { createStackNavigator } from 'react-navigation-stack';
import { Platform } from 'react-native';

import { Easing, Animated } from 'react-native';

import Home from './layouts/Home'
import Cards from './layouts/Cards'
import Favorites from './layouts/Favorites'
import Settings from './layouts/Settings'
import Profile from './layouts/Profile'
import New from './layouts/New'
import Announcer from './layouts/Announcer'
import APITest from './components/APITest'

import Account from './layouts/Account'
import Language from './layouts/Language'
import Voice from './layouts/Voice'
import Notification from './layouts/Notification'
import Browser from './layouts/Browser'
import Remove from './layouts/Remove'
import Packs from './layouts/Packs'
import Avatar from './layouts/Avatar'
import Subscription from './layouts/Subscription'
import Premium from './layouts/Premium'
import Legal from './layouts/Legal'
import Accessibility from './layouts/Accessibility'
import Apps from './layouts/Apps'

const AppNavigator = createStackNavigator({
    Home:         { screen: Home          },
    Cards:        { screen: Cards         },
    Favorites:    { screen: Favorites     },
    Settings:     { screen: Settings      },
    Profile:      { screen: Profile       },
    New:          { screen: New           },
    Account:      { screen: Account       },
    Browser:      { screen: Browser       },
    Language:     { screen: Language      },
    Voice:        { screen: Voice         },
    Notification: { screen: Notification  },
    Remove:       { screen: Remove        },
    Packs:        { screen: Packs         },
    Avatar:       { screen: Avatar        },
    Subscription: { screen: Subscription  },
    Premium:      { screen: Premium       },
    Legal:        { screen: Legal         },
    Accessibility:{ screen: Accessibility },
    Apps:         { screen: Apps          },
    APITest:      { screen: APITest       },
  },
  {
    headerMode: 'none',
    navigationOptions: {
      headerVisible: false,
    },
    ...(Platform.OS === 'web' ? {
      initialRouteName: 'Home',
      defaultNavigationOptions: {
        headerShown: false,
      },
      mode: 'card',
      cardStyle: {
        backgroundColor: 'transparent',
      },
    } : {})
  }
);
function forVertical(props) {
  const { layout, position, scene } = props;

  const index = scene.index;
  const height = layout.initHeight;

  const translateX = 0;
  const translateY = position.interpolate({
    inputRange: ([index - 1, index, index + 1]: Array<number>),
    outputRange: ([height, 0, 0]: Array<number>)
  });
  const opacity = position.interpolate({
    inputRange: ([index - 1, index, index + 1]: Array<number>),
    outputRange: [0, 1, 0]
  });

  return {
    transform: [{ translateX }, { translateX }],
    opacity
  };
}
const RootNavigator = createAppContainer(AppNavigator);
const ModelNavigator = createStackNavigator({
    Root: { screen: RootNavigator },
    Announcer: {screen: Announcer }
  },
  {
    mode: 'modal',
    headerMode: 'none',
    defaultNavigationOptions: {
      headerVisible: false,
      gesturesEnabled: false,
    },
    cardStyle: {
      backgroundColor: 'transparent',
      opacity: 1,
    },
    transparentCard: true,
    transitionConfig: () => ({
      transitionSpec: {
        duration: 0,
      },
      containerStyle: {
        backgroundColor: 'transparent',
      }
    }),
    ...(Platform.OS === 'web' ? {
      initialRouteName: 'Root',
      defaultNavigationOptions: {
        headerShown: false,
      },
      mode: 'card',
    } : {})
  }
);

export default createAppContainer(ModelNavigator);
