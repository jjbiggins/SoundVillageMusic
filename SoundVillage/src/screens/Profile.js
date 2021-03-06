import React from 'react';
import {
    StyleSheet,
    Platform,
    Image,
    Text,
    View,
    Button,
    SafeAreaView,
    Dimensions,
    ActivityIndicator, FlatList
} from 'react-native';
import firebase from 'react-native-firebase';
import {Avatar, ListItem, SearchBar} from 'react-native-elements';
import Spotify from 'rn-spotify-sdk';
import Icon from "react-native-vector-icons/FontAwesome";
import MiniSpotifyPlayer from '../components/MiniSpotifyPlayer';
import {NavigationEvents} from "react-navigation";
import EventEmitter from 'events';
import RNEvents from 'react-native-events';
import TouchableScale from "react-native-touchable-scale";
import LinearGradient from "react-native-linear-gradient";

const nativeEvents = new EventEmitter();

const genreDict = {'Rock': 'https://i.postimg.cc/7ZxtS7Bk/icons8-rock-music-64.png', 'Pop': 'https://i.postimg.cc/wB4rqvQd/icons8-ice-pop-pink-64.png', 'Hip Hop/Rap': 'https://i.postimg.cc/8cMXmbQ1/icons8-hip-hop-music-96.png',
    'Throwback': 'https://i.postimg.cc/L8T7Wvq5/icons8-boombox-96.png', 'Party Time': 'https://i.postimg.cc/XY3mxtYt/icons8-champagne-64.png', 'Night In': 'https://i.postimg.cc/fTQrT1mk/icons8-night-64.png',
    'Random': 'https://i.postimg.cc/PxBFDR73/icons8-musical-notes-64.png', 'Workout': 'https://i.postimg.cc/sfhLz3Bt/icons8-muscle-64.png', 'Happy': 'https://i.postimg.cc/c475KTBh/icons8-party-64.png',
    'Sad': 'https://i.postimg.cc/sXBNvrTG/icons8-crying-80.pngs', 'Alternative': 'https://i.postimg.cc/L8T7Wvq5/icons8-boombox-96.png', 'Country': 'https://i.postimg.cc/zfGMYWWj/icons8-country-music-96.png'};

//
// Description: Shows the user details (name, profile picture, saved playlists)
//
// Navigation Options: Settings
//

export default class Profile extends React.Component {
    constructor(props){
        super(props);
        this.ref = firebase.firestore().collection('users');
        this.unsubscribe = null;
        this.state = {
            currentUser: null,
            currentUserInfo: null,
            loading: true,
            savedPlaylists: [],
            spotifyPlayer: null,
        };
        this.handleFocus = this.handleFocus.bind(this);

    }

    static navigationOptions = ({ navigation, navigationOptions }) => {
        const { params } = navigation.state;

        return {

            headerTitle: 'My Profile',
            /* These values are used instead of the shared configuration! */
            headerRight: (
                null
            ),
            headerLeft: (
                null
            ),
            headerStyle: {
                backgroundColor: '#303338',
                textAlign: 'center',
            },
            headerTintColor: '#fff',
            headerTitleStyle: {
                fontWeight: 'bold',
                textAlign: 'center',
                flexGrow: 1
            },
        };
    };

    componentDidMount() {
        const {currentUser} = firebase.auth();
        this.unsubscribe = this.ref.doc(currentUser.uid).collection('savedPlaylists').onSnapshot(this.onCollectionUpdate);
        if (Platform.OS == 'ios'){
            firebase.firestore().collection('users').doc(currentUser.uid).onSnapshot((doc) => {
                this.setState({currentUser: doc._data, spotifyPlayer: Spotify.getPlaybackMetadata()});
            });
            RNEvents.addSubscriber(Spotify, nativeEvents);
            nativeEvents.on('trackChange', () => {
                this.handleFocus()
            });
        }
        else {
            this.setState({currentUser: currentUser});
        }
        firebase.firestore().collection('users').doc(currentUser.uid).get().then((doc) => {
            let user = {
                uid: currentUser.uid,
                email: doc.data().email,
                firstName: doc.data().firstName,
                lastName: doc.data().lastName,
                profilePic: doc.data().downloadUrl,
            };
            console.log("The profile is", user);
            this.setState({currentUserInfo: user, loading: false});
        });
    }

    handleFocus() {
        if (Platform.OS == 'ios') {
            this.setState({spotifyPlayer: Spotify.getPlaybackMetadata()});
        }
    }

    onCollectionUpdate = (querySnapshot) => {
        const playlists = [];
        querySnapshot.forEach((doc) => {
            const { name, adminID, isPrivate, genre, adminName } = doc.data();
            console.log('This is: ', doc);
            playlists.push({
                id: doc.id,
                name,
                adminID,
                isPrivate,
                genre,
                adminName,
            });
            console.log('These are the playlists: ', playlists);
        });
        this.setState({
            savedPlaylists: playlists
        });
    };

    onSignOutPress() {
        Spotify.setPlaying(false);
        firebase.auth().signOut().then(() => {
            console.log('signed out');
            this.props.navigation.navigate('Login');
        })
            .catch((error) => {
                console.log(error);
                // go to login screen
            });
    }

    render() {
        if (this.state.loading) {
            return (
                <SafeAreaView style={styles.container} forceInset={{ bottom: 'never' }}>
                    <ActivityIndicator />
                </SafeAreaView>
            );
        }
        else if (Platform.OS == 'ios' && this.state.spotifyPlayer && this.state.currentUser.currentPlaylistPlaying){
            return (
                <SafeAreaView style={styles.container}>
                    <NavigationEvents
                        //onWillFocus={payload => console.log('will focus',payload)}
                        onDidFocus={payload => {
                            this.handleFocus();
                            //console.log("FOCUSED!!!!!!!!!!!!!", this.state)
                        }}
                        //onWillBlur={payload => console.log('will blur',payload)}
                        //onDidBlur={payload => console.log('did blur',payload)}
                    />
                    <View style={styles.topView}>
                        <Avatar
                            rounded
                            containerStyle={{margin: 10}}
                            size={Dimensions.get('window').width * 0.4}
                            title={this.state.currentUserInfo.firstName.charAt(0) + this.state.currentUserInfo.lastName.charAt(0)}
                            source={{uri: this.state.currentUserInfo.profilePic}}
                        />
                        <View style={{margin:5, width: "50%", flex: 1, alignItems: 'center'}}>
                            <Button
                                color={'#F7F7F2'}
                                type="clear"
                                title="Sign Out"
                                onPress={() => this.onSignOutPress()}
                            />
                            <Text style={{color: '#F7F7F2', fontSize: 18, fontWeight: 'bold'}}>
                                {this.state.currentUserInfo.firstName + ' ' + this.state.currentUserInfo.lastName}
                            </Text>
                            <Text style={{color: '#F7F7F2', fontSize: 16}}>
                                {this.state.currentUserInfo.email}
                            </Text>
                        </View>
                    </View>
                    <View style={{bottom: 90, top: 0, margin: 10, right: 0, left: 0}}>
                        <Text style={{fontSize: 20, fontWeight: 'bold', color: '#303338'}}>Saved Playlists</Text>
                        <FlatList style={{bottom: 0, top: 0, right: 0, left: 0}}
                            data={this.state.savedPlaylists}
                            renderItem={({ item }) =>
                                <ListItem
                                    Component={TouchableScale}
                                    friction={90} //
                                    tension={100} // These props are passed to the parent component (here TouchableScale)
                                    activeScale={0.7} //
                                    linearGradientProps={{
                                        colors: ['#303338', '#F7F7F2'],
                                        start: {x: 1, y: 0},
                                        end: {x: 0.2, y: 0},
                                    }}
                                    ViewComponent={LinearGradient} // Only if no expo
                                    title={item.name}
                                    titleStyle={styles.listItemTitle}
                                    subtitle={
                                        <View>
                                            <Text>{"Admin: " + item.adminName}</Text>
                                            <Text>{item.usersJoinedAmount + " Users"}</Text>
                                        </View>}
                                    leftAvatar={{
                                        title: item.genre[0],
                                        source: {uri: genreDict[item.genre]},
                                        size: 'large',
                                        avatarStyle: {backgroundColor: '#F7F7F2'},
                                        rounded: false
                                    }}
                                    //leftAvatar={{rounded: false, source:{require("./assets/" + genreDict[item.genre])}}} //wi]ll be based on genre for playlist/type
                                    onPress={(item) => this.navigateToDetail(item)}
                                    //rightIcon={this.renderRightIcon(item)}
                                    containerStyle={styles.listItemContainer}
                                    chevronColor='#303338'
                                    chevron
                                />
                            }
                            keyExtractor={item => item.id}
                        />
                        <MiniSpotifyPlayer
                            spotifyCoverArt={this.state.spotifyPlayer.currentTrack.albumCoverArtURL}
                            spotifySongName={this.state.spotifyPlayer.currentTrack.contextName}
                            spotifyArtistName={this.state.spotifyPlayer.currentTrack.artistName}
                            spotifyAlbumName={this.state.spotifyPlayer.currentTrack.albumName}
                        />
                    </View>

                </SafeAreaView>
            );
        }
        else if (Platform.OS == 'ios' && (!this.state.spotifyPlayer || !this.state.currentUser.currentPlaylistPlaying)){
            return (
                <SafeAreaView style={styles.container}>
                    <NavigationEvents
                        //onWillFocus={payload => console.log('will focus',payload)}
                        onDidFocus={payload => {
                            this.handleFocus();
                            //console.log("FOCUSED!!!!!!!!!!!!!", this.state)
                        }}
                        //onWillBlur={payload => console.log('will blur',payload)}
                        //onDidBlur={payload => console.log('did blur',payload)}
                    />
                    <View style={styles.topView}>
                        <Avatar
                            rounded
                            containerStyle={{margin: 10}}
                            size={Dimensions.get('window').width * 0.4}
                            title={this.state.currentUserInfo.firstName.charAt(0) + this.state.currentUserInfo.lastName.charAt(1)}
                            source={{uri: this.state.currentUserInfo.profilePic}}
                        />
                        <View style={{margin:5, width: "50%", flex: 1, alignItems: 'center'}}>
                            <Button
                                color={'#F7F7F2'}
                                type="clear"
                                title="Sign Out"
                                onPress={() => this.onSignOutPress()}
                            />
                            <Text style={{color: '#F7F7F2', fontSize: 18, fontWeight: 'bold'}}>
                                {this.state.currentUserInfo.firstName + ' ' + this.state.currentUserInfo.lastName}
                            </Text>
                            <Text style={{color: '#F7F7F2', fontSize: 16}}>
                                {this.state.currentUserInfo.email}
                            </Text>
                        </View>
                    </View>
                    <View style={{top: 0, bottom: 0, margin: 10, right: 0, left: 0}}>
                        <Text style={{fontSize: 20, fontWeight: 'bold', color: '#303338'}}>Saved Playlists</Text>
                        <FlatList style={{bottom: 0, top: 0, right: 0, left: 0}}
                            data={this.state.savedPlaylists}
                            renderItem={({ item }) =>
                                <ListItem
                                    Component={TouchableScale}
                                    friction={90} //
                                    tension={100} // These props are passed to the parent component (here TouchableScale)
                                    activeScale={0.7} //
                                    linearGradientProps={{
                                        colors: ['#303338', '#F7F7F2'],
                                        start: {x: 1, y: 0},
                                        end: {x: 0.2, y: 0},
                                    }}
                                    ViewComponent={LinearGradient} // Only if no expo
                                    title={item.name}
                                    titleStyle={styles.listItemTitle}
                                    subtitle={
                                        <View>
                                            <Text>{"Admin: " + item.adminName}</Text>
                                            <Text>{item.usersJoinedAmount + " Users"}</Text>
                                        </View>}
                                    leftAvatar={{
                                        title: item.genre[0],
                                        source: {uri: genreDict[item.genre]},
                                        size: 'large',
                                        avatarStyle: {backgroundColor: '#F7F7F2'},
                                        rounded: false
                                    }}
                                    //leftAvatar={{rounded: false, source:{require("./assets/" + genreDict[item.genre])}}} //wi]ll be based on genre for playlist/type
                                    onPress={(item) => this.navigateToDetail(item)}
                                    //rightIcon={this.renderRightIcon(item)}
                                    containerStyle={styles.listItemContainer}
                                    chevronColor='#303338'
                                    chevron
                                />
                            }
                            keyExtractor={item => item.id}
                        />
                    </View>
                </SafeAreaView>
            );
        }
        return (
           <SafeAreaView style={styles.container} forceInset={{ bottom: 'never' }}>
               <View style={styles.topView}>
                   <Avatar
                       rounded
                       containerStyle={{margin: 10}}
                       size={Dimensions.get('window').width * 0.4}
                       title={this.state.currentUserInfo.firstName.charAt(0) + this.state.currentUserInfo.lastName.charAt(1)}
                       source={{uri: this.state.currentUserInfo.profilePic}}
                   />
                   <View style={{margin:5, width: "50%", flex: 1, alignItems: 'center'}}>
                       <Button
                           color={'#F7F7F2'}
                           type="clear"
                           title="Sign Out"
                           onPress={() => this.onSignOutPress()}
                       />
                       <Text style={{color: '#F7F7F2', fontSize: 18, fontWeight: 'bold'}}>
                           {this.state.currentUserInfo.firstName + ' ' + this.state.currentUserInfo.lastName}
                       </Text>
                       <Text style={{color: '#F7F7F2', fontSize: 16}}>
                           {this.state.currentUserInfo.email}
                       </Text>
                   </View>
               </View>
               <View style={{bottom: 0, top: 0, margin: 10, right: 0, left: 0}}>
                   <Text style={{fontSize: 20, fontWeight: 'bold', color: '#303338'}}>Saved Playlists</Text>
                   <FlatList style={{bottom: 0, top: 0, right: 0, left: 0}}
                       data={this.state.savedPlaylists}
                       renderItem={({ item }) =>
                           <ListItem
                               Component={TouchableScale}
                               friction={90} //
                               tension={100} // These props are passed to the parent component (here TouchableScale)
                               activeScale={0.7} //
                               linearGradientProps={{
                                   colors: ['#303338', '#F7F7F2'],
                                   start: {x: 1, y: 0},
                                   end: {x: 0.2, y: 0},
                               }}
                               ViewComponent={LinearGradient} // Only if no expo
                               title={item.name}
                               titleStyle={styles.listItemTitle}
                               subtitle={
                                   <View>
                                       <Text>{"Admin: " + item.adminName}</Text>
                                       <Text>{item.usersJoinedAmount + " Users"}</Text>
                                   </View>}
                               leftAvatar={{
                                   title: item.genre[0],
                                   source: {uri: genreDict[item.genre]},
                                   size: 'large',
                                   avatarStyle: {backgroundColor: '#F7F7F2'},
                                   rounded: false
                               }}
                               //leftAvatar={{rounded: false, source:{require("./assets/" + genreDict[item.genre])}}} //wi]ll be based on genre for playlist/type
                               onPress={(item) => this.navigateToDetail(item)}
                               //rightIcon={this.renderRightIcon(item)}
                               containerStyle={styles.listItemContainer}
                               chevronColor='#303338'
                               chevron
                           />
                       }
                       keyExtractor={item => item.id}
                   />
               </View>
           </SafeAreaView>
       )
    }
}
const styles = StyleSheet.create({
    container: {
        flex: 1,
        //justifyContent: 'center',
        //alignItems: 'center',
        backgroundColor: '#BEE5BF',
    },
    topView: {
        //flex: 1,
        flexDirection: 'row',
        alignItems: 'center',
        backgroundColor: '#303338',
        height: "40%",
        margin: 5,
        borderRadius: 5,
    },
    listItemContainer: {
        margin: 10,
        backgroundColor: '#F7F7F2',
        borderRadius: 5,
        flex: 1
    },
    listItemTitle: {
        fontSize: 20,
        fontWeight: 'bold',
        color: '#303338'
    }
});