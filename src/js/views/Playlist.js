
import React from 'react';
import { connect } from 'react-redux';
import { bindActionCreators } from 'redux';
import ErrorMessage from '../components/ErrorMessage';
import Button from '../components/Button';
import TrackList from '../components/TrackList';
import Thumbnail from '../components/Thumbnail';
import PinButton from '../components/Fields/PinButton';
import { nice_number } from '../components/NiceNumber';
import { Dater, dater } from '../components/Dater';
import FollowButton from '../components/Fields/FollowButton';
import Loader from '../components/Loader';
import ContextMenuTrigger from '../components/ContextMenuTrigger';
import URILink from '../components/URILink';
import Icon from '../components/Icon';
import * as coreActions from '../services/core/actions';
import * as uiActions from '../services/ui/actions';
import * as mopidyActions from '../services/mopidy/actions';
import * as spotifyActions from '../services/spotify/actions';
import {
  uriSource,
  getFromUri,
  sourceIcon,
  decodeMopidyUri,
} from '../util/helpers';
import { i18n, I18n } from '../locale';
import { makeItemSelector, makeLoadingSelector } from '../util/selectors';
import { sortItems } from '../util/arrays';

class Playlist extends React.Component {
  constructor(props) {
    super(props);

    let { uri } = props;

    // Spotify upgraded their playlists URI to remove user component (Sept 2018)
    // We accept the old format, and redirect to the new one
    if (uri.includes('spotify:user:')) {
      uri = uri.replace(/spotify:user:([^:]*?):/i, 'spotify:');
      props.history.push(`/playlist/${encodeURIComponent(uri)}`);
    }
  }

  componentDidMount() {
    const { coreActions: { loadItem }, uri } = this.props;
    this.setWindowTitle();
    loadItem(uri, { full: true });
  }

  componentDidUpdate = ({
    uri: prevUri,
    playlist: prevPlaylist,
  }) => {
    const {
      uri,
      playlist,
      coreActions: {
        loadItem,
      },
      history: {
        push,
      },
    } = this.props;

    if (prevPlaylist && playlist && prevPlaylist.moved_to !== playlist.moved_to) {
      push(`/playlist/${encodeURIComponent(playlist.moved_to)}`);
    }

    if (uri !== prevUri) {
      loadItem(uri, { full: true });
    }

    if (!prevPlaylist && playlist) this.setWindowTitle(playlist);
    if (prevUri !== uri && playlist) this.setWindowTitle(playlist);
  }

  setWindowTitle = (playlist = this.props.playlist) => {
    const { uiActions: { setWindowTitle } } = this.props;
    setWindowTitle(
      playlist ? i18n('playlist.title_window', { name: playlist.name }) : i18n('playlist.title')
    );
  }

  handleContextMenu = (e) => {
    const {
      uiActions: {
        showContextMenu,
      },
      playlist,
      uri,
    } = this.props;

    showContextMenu({
      e,
      context: 'playlist',
      items: [playlist],
      uris: [uri],
    });
  }

  play = () => {
    const {
      mopidyActions: {
        playPlaylist,
      },
      playlist: {
        uri,
      },
    } = this.props;

    playPlaylist(uri);
  }

  // TODO: Once deletion occurs, remove playlist from global playlists list
  delete = () => {
    const {
      mopidyActions: {
        deletePlaylist,
      },
      playlist: {
        uri,
      },
    } = this.props;

    deletePlaylist(uri);
  }

  reorderTracks = (indexes, index) => {
    const {
      coreActions: {
        reorderPlaylistTracks,
      },
      playlist: {
        uri,
        snapshot_id,
      },
    } = this.props;

    reorderPlaylistTracks(uri, indexes, index, snapshot_id);
  }

  removeTracks = (tracks_indexes) => {
    const {
      coreActions: {
        removeTracksFromPlaylist,
      },
      playlist: {
        uri,
      },
    } = this.props;

    removeTracksFromPlaylist(uri, tracks_indexes);
  }

  inLibrary = () => {
    const { uri } = this.props;
    const libraryName = `${uriSource(uri)}_library_playlists`;
    const { [libraryName]: library } = this.props;

    if (!library) return false;

    return library.indexOf(uri) > -1;
  }

  togglePinned = () => {
    const {
      uri,
      coreActions: {
        addPinned,
        removePinned,
      },
    } = this.props;

    if (this.isPinned()) {
      removePinned(uri);
    } else {
      addPinned(uri);
    }
  }

  renderActions = () => {
    const {
      uri,
      playlist: {
        can_edit,
        name,
        in_library,
      },
    } = this.props;

    switch (uriSource(uri)) {
      case 'm3u':
        return (
          <div className="actions">
            <Button
              type="primary"
              onClick={this.play}
              tracking={{ category: 'Playlist', action: 'Play' }}
            >
              <I18n path="actions.play" />
            </Button>
            <Button
              to={`/playlist/${encodeURIComponent(uri)}/edit`}
              tracking={{ category: 'Playlist', action: 'Edit' }}
            >
              <I18n path="actions.edit" />
            </Button>
            <PinButton item={{ uri, name }} />
            <ContextMenuTrigger onTrigger={this.handleContextMenu} />
          </div>
        );

      case 'spotify':
        if (can_edit) {
          return (
            <div className="actions">
              <Button
                type="primary"
                onClick={this.play}
                tracking={{ category: 'Playlist', action: 'Play' }}
              >
                <I18n path="actions.play" />
              </Button>
              <Button
                to={`/playlist/${encodeURIComponent(uri)}/edit`}
                tracking={{ category: 'Playlist', action: 'Edit' }}
              >
                <I18n path="actions.edit" />
              </Button>
              <PinButton item={{ uri, name }} />
              <ContextMenuTrigger onTrigger={this.handleContextMenu} />
            </div>
          );
        }
        return (
          <div className="actions">
            <Button
              type="primary"
              onClick={this.play}
              tracking={{ category: 'Playlist', action: 'Play' }}
            >
              <I18n path="actions.play" />
            </Button>
            <FollowButton
              uri={uri}
              is_following={in_library}
            />
            <PinButton item={{ uri, name }} />
            <ContextMenuTrigger onTrigger={this.handleContextMenu} />
          </div>
        );

      default:
        return (
          <div className="actions">
            <Button
              type="primary"
              onClick={this.play}
              tracking={{ category: 'Playlist', action: 'Play' }}
            >
              <I18n path="actions.play" />
            </Button>
            <PinButton item={{ uri, name }} />
            <ContextMenuTrigger onTrigger={this.handleContextMenu} />
          </div>
        );
    }
  }

  render = () => {
    const {
      uri,
      playlist,
      loading,
      slim_mode,
    } = this.props;

    if (!playlist) {
      if (loading) {
        return <Loader body loading />;
      }
      return (
        <ErrorMessage type="not-found" title="Not found">
          <p>
            <I18n path="errors.uri_not_found" uri={uri} />
          </p>
        </ErrorMessage>
      );
    }

    let context = 'playlist';
    if (playlist.can_edit) {
      context = 'editable-playlist';
    }

    return (
      <div className="view playlist-view content-wrapper preserve-3d">

        <div className="thumbnail-wrapper">
          <Thumbnail size="large" glow canZoom images={playlist.images} type="playlist" />
        </div>

        <div className="title">
          <h1>{playlist.name}</h1>
          {playlist.description && (
            <h2
              className="description"
              dangerouslySetInnerHTML={{ __html: playlist.description }}
            />
          )}

          <ul className="details">
            {!slim_mode && (
              <li className="source">
                <Icon type="fontawesome" name={sourceIcon(playlist.uri)} />
              </li>
            )}
            {playlist.user && (
              <li>
                <URILink
                  type="user"
                  uri={playlist.user.uri}
                >
                  {playlist.user.name}
                </URILink>
              </li>
            )}
            <li>
              <I18n path="specs.tracks" count={playlist.tracks ? playlist.tracks.length : 0} />
            </li>
            {!slim_mode && playlist.tracks && playlist.tracks_total > 0 && (
              <li><Dater type="total-time" data={playlist.tracks} /></li>
            )}
            {!slim_mode && playlist.followers !== undefined && (
              <li>
                <I18n path="specs.followers" count={nice_number(playlist.followers)} />
              </li>
            )}
            {!slim_mode && playlist.last_modified_date && (
              <li>
                <I18n path="specs.edited" date={dater('ago', playlist.last_modified_date)} />
              </li>
            )}
          </ul>
        </div>

        {this.renderActions()}

        <section className="list-wrapper">
          <TrackList
            uri={playlist.uri}
            className="playlist-track-list"
            track_context={context}
            tracks={playlist.tracks}
            removeTracks={this.removeTracks}
            reorderTracks={this.reorderTracks}
          />
        </section>

        {loading && <Loader body loading />}
      </div>
    );
  }
}

const mapStateToProps = (state, ownProps) => {
  const {
    ui: {
      allow_reporting,
      slim_mode,
      theme,
    } = {},
    spotify: {
      library_playlists: spotify_library_playlists,
      authorization: spotify_authorized,
      me = {},
    } = {},
    mopidy: {
      library_playlists: local_library_playlists,
    } = {},
  } = state;

  const uri = decodeMopidyUri(ownProps.match.params.uri);
  const playlistId = getFromUri('playlistid', uri);
  const itemSelector = makeItemSelector(uri);
  const loadingSelector = makeLoadingSelector([`(.*)${playlistId}(?!.*(following))(.*)`]);

  return {
    uri,
    allow_reporting,
    slim_mode,
    theme,
    loading: loadingSelector(state),
    playlist: itemSelector(state),
    spotify_library_playlists,
    local_library_playlists,
    spotify_authorized,
    spotify_userid: (me && me.id) || null,
  };
};

const mapDispatchToProps = (dispatch) => ({
  coreActions: bindActionCreators(coreActions, dispatch),
  uiActions: bindActionCreators(uiActions, dispatch),
  mopidyActions: bindActionCreators(mopidyActions, dispatch),
  spotifyActions: bindActionCreators(spotifyActions, dispatch),
});

export default connect(mapStateToProps, mapDispatchToProps)(Playlist);
