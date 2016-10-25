
import React, { PropTypes } from 'react'
import FontAwesome from 'react-fontawesome'
import ArtistSentence from './ArtistSentence'
import AlbumLink from './AlbumLink'

export default class Track extends React.Component{

	constructor(props) {
		super(props);
	}

	handleClick( e ){
		var target = $(e.target);
		if( !target.is('a') && target.closest('a').length <= 0 ){
			this.props.handleClick(e);
		}
	}

	handleDoubleClick( e ){
		return this.props.handleDoubleClick(e);
	}

	formatDuration(){
		if( typeof(this.props.track.duration_ms) !== 'undefined' ){
			var ms = this.props.track.duration_ms;
		}else if( typeof(this.props.track.length) !== 'undefined' ){
			var ms = this.props.track.length;
		}else{
			return null;
		}

		var time = new Date(ms);
		var min = time.getMinutes();
		var sec = time.getSeconds();
		if( sec < 10 ) sec = '0'+sec;
		return min+':'+sec;
	}

	render(){

		var className = 'list-item track';
		if( typeof(this.props.track.selected) !== 'undefined' && this.props.track.selected ){
			className += ' selected';
		}

		if( this.props.track.playing ){
			className += ' playing';
		}

		return (
			<div
				className={className}
				onDoubleClick={ (e) => this.handleDoubleClick(e) }
				onClick={ (e) => this.handleClick(e) }>
					{ this.props.track.selected ? <FontAwesome name="check" className="select-state" fixedWidth /> : null }
					<span className="col name">
						{this.props.track.name}
					</span>
					<span className="col artists">
						{ this.props.track.artists ? <ArtistSentence artists={this.props.track.artists} /> : null }
					</span>
					<span className="col album">
						{ this.props.track.album ? <AlbumLink album={this.props.track.album} /> : null }
					</span>
					<span className="col duration">
						{ this.formatDuration() }
					</span>
			</div>
		);
	}
}