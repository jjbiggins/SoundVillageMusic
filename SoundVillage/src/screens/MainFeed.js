import React from 'react';
import {StyleSheet, FlatList, ActivityIndicator, Text, View, TouchableHighlight, Alert, SafeAreaView, Platform} from 'react-native';
import firebase from 'react-native-firebase';
import {List, ListItem, SearchBar} from 'react-native-elements';
import SearchBar2 from 'react-native-search-bar';
import Icon from "react-native-vector-icons/FontAwesome";
import Spotify from "rn-spotify-sdk";
import MiniSpotifyPlayer from '../components/MiniSpotifyPlayer';
import {NavigationEvents} from "react-navigation";
import EventEmitter from 'events';
import RNEvents from 'react-native-events';
import TouchableScale from 'react-native-touchable-scale'; // https://github.com/kohver/react-native-touchable-scale
import LinearGradient from 'react-native-linear-gradient'; // Only if no expo

const nativeEvents = new EventEmitter();

//
// Description: Shows a list of the playlists that are in the users range of location. Search functionality.
//
// Navigation Options: PlaylistDetail
//
const genreDict = {'Rock': 'https://i.postimg.cc/7ZxtS7Bk/icons8-rock-music-64.png', 'Pop': 'https://i.postimg.cc/wB4rqvQd/icons8-ice-pop-pink-64.png', 'Hip Hop/Rap': 'https://i.postimg.cc/8cMXmbQ1/icons8-hip-hop-music-96.png',
            'Throwback': 'https://i.postimg.cc/L8T7Wvq5/icons8-boombox-96.png', 'Party Time': 'https://i.postimg.cc/XY3mxtYt/icons8-champagne-64.png', 'Night In': 'https://i.postimg.cc/fTQrT1mk/icons8-night-64.png',
            'Random': 'https://i.postimg.cc/PxBFDR73/icons8-musical-notes-64.png', 'Workout': 'https://i.postimg.cc/sfhLz3Bt/icons8-muscle-64.png', 'Happy': 'https://i.postimg.cc/c475KTBh/icons8-party-64.png',
            'Sad': 'https://i.postimg.cc/sXBNvrTG/icons8-crying-80.pngs', 'Alternative': 'https://i.postimg.cc/L8T7Wvq5/icons8-boombox-96.png', 'Country': 'https://i.postimg.cc/zfGMYWWj/icons8-country-music-96.png'};

export default class MainFeed extends React.Component {
    searchPlaylist: SearchBar2;

    constructor(props){
        super(props);
        this.ref = firebase.firestore().collection('playlists');
        this.unsubscribe = null;
        this.arrayholder =[];
        this.state = {
            currentUser: null,
            playlists: [],
            loading: true,
            search: '',
            spotifyPlayer: null,
        };
        this.handleFocus = this.handleFocus.bind(this);
    }

    componentWillUnmount() {
        this.unsubscribe();
    }

    static navigationOptions = ({ navigation, navigationOptions }) => {
        const { params } = navigation.state;

        return {

            title: 'Home',
            /* These values are used instead of the shared configuration! */
            headerStyle: {
                backgroundColor: '#303338',
            },
            headerTintColor: '#F7F7F2',
            headerTitleStyle: {
                fontWeight: 'bold',
            },
        };
    };

    componentDidMount() {
        this.unsubscribe = this.ref.onSnapshot(this.onCollectionUpdate);
        const {currentUser} = firebase.auth();
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
    }

    handleFocus() {
        if (Platform.OS == 'ios') {
            this.setState({spotifyPlayer: Spotify.getPlaybackMetadata()});
        }
    }

    renderRightIcon = (item) => {
        //console.log("CURRENT PLAYER", this.state);
        if (item.isPrivate){
            return (
            <Icon
                name="lock"
                size={25}
                color="black"
            />)
        }
        return (
            null
        )
    };

    searchFilterFunction = text => {
        this.setState({
            search: text,
        });
        const newData = this.arrayholder.filter(function (item) {
            const data = item.name ? item.name.toUpperCase() : ''.toUpperCase();
            const textData = text.toUpperCase();
            return data.indexOf(textData) > -1
        });
        this.setState({
            playlists : newData,
            search: text,
        });
    };

    navigateToDetail = item => {
        if (item.id == this.state.currentUser.uid){
            this.props.navigation.navigate('PlaylistDetail', {playlistID: item.id, playlistName: item.name, type: 'admin'});
        }
        else {
            this.props.navigation.navigate('PlaylistDetail', {playlistID: item.id, playlistName: item.name, type: 'contributor'});
        }
    };


    onCollectionUpdate = (querySnapshot) => {
        const playlists = [];
        querySnapshot.forEach((doc) => {
            const { name, adminID, isPrivate, genre, adminName, playlistPassword, usersJoinedAmount } = doc.data();
            //console.log('This is: ', doc);
            playlists.push({
                id: doc.id,
                name,
                adminID,
                isPrivate,
                genre,
                playlistPassword
                adminName,
                usersJoinedAmount
            });
            //console.log('These are the playlists: ', playlists);
        });
        this.setState({
            playlists,
            loading: false,
        });
        this.arrayholder = this.state.playlists;
        //console.log(this.arrayholder);
    };

    render() {
        if (this.state.loading){
            return (
                <SafeAreaView style={styles.container} forceInset={{ bottom: 'never' }}>
                    <Text>Loading</Text>
                    <ActivityIndicator size="large" />
                </SafeAreaView>
            )
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
                    <SearchBar2
                        placeholder="Search Playlists"
                        ref={ref => (this.searchPlaylist = ref)}
                        barTintColor='#303338'
                        tintColor='#BEE5BF'
                        onChangeText={text => this.searchFilterFunction(text)}
                        onCancelButtonPress={text=> this.searchFilterFunction('')}
                    />
                    <FlatList style={{position: 'absolute', bottom: 90, top: 60, right: 0, left: 0}}
                        data={this.state.playlists}
                        renderItem={({ item }) =>
                            <ListItem
                                Component={TouchableScale}
                                friction={90} //
                                tension={100} // These props are passed to the parent component (here TouchableScale)
                                activeScale={0.7} //
                                linearGradientProps={{
                                    colors: ['#BEE5BF', '#F7F7F2'],
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
                                onPress={() => this.navigateToDetail(item)}
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
                    <SearchBar2
                        placeholder="Search Playlists"
                        ref={ref => (this.searchPlaylist = ref)}
                        barTintColor='#303338'
                        tintColor='#BEE5BF'
                        onChangeText={text => this.searchFilterFunction(text)}
                        onCancelButtonPress={text=> this.searchFilterFunction('')}
                    />
                    <FlatList style={{position: 'absolute', bottom: 0, top: 60, right: 0, left: 0}}
                              data={this.state.playlists}
                              renderItem={({ item }) =>
                                  <ListItem
                                      Component={TouchableScale}
                                      friction={90} //
                                      tension={100} // These props are passed to the parent component (here TouchableScale)
                                      activeScale={0.7} //
                                      linearGradientProps={{
                                          colors: ['#BEE5BF', '#F7F7F2'],
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
                                      onPress={() => this.navigateToDetail(item)}
                                      //rightIcon={this.renderRightIcon(item)}
                                      containerStyle={styles.listItemContainer}
                                      chevronColor='black'
                                      chevron
                                  />
                              }
                              keyExtractor={item => item.id}
                    />
                </SafeAreaView>
            );
        }
        return (
            <SafeAreaView style={styles.container} forceInset={{ bottom: 'never' }}>
                <SearchBar
                    placeholder="Search Playlists"
                    onChangeText={text => this.searchFilterFunction(text)}
                    //onClear={text=> this.searchFilterFunction('')}
                    value={this.state.search}
                />
                <FlatList
                    data={this.state.playlists}
                    renderItem={({ item }) =>
                                <ListItem
                                    Component={TouchableScale}
                                    friction={90} //
                                    tension={100} // These props are passed to the parent component (here TouchableScale)
                                    activeScale={0.7} //
                                    linearGradientProps={{
                                        colors: ['#BEE5BF', '#F7F7F2'],
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
            </SafeAreaView>
        );
    }
}
const styles = StyleSheet.create({
    container: {
        flex: 1,
        //justifyContent: 'center',
        //alignItems: 'center'
        backgroundColor: '#303338'
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