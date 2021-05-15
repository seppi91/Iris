FROM debian:stable

# Switch to the root user while we do our changes
USER root

# Install GStreamer and other required Debian packages
RUN apt-get update \
  && apt-get install -y --no-install-recommends \
    wget \
    gnupg2 \
    git \
    python3-setuptools \
    python3-pip \
    dumb-init \
    graphviz-dev \
    gstreamer1.0-plugins-bad \
    gstreamer1.0-plugins-good \
    gstreamer1.0-plugins-ugly \
    gstreamer1.0-pulseaudio \
    libasound2-dev \
    python3-dev \
    python3-gst-1.0 \
    build-essential \
    libdbus-glib-1-dev \
    libgirepository1.0-dev \
    dleyna-server \
    sudo \
  && rm -rf /var/lib/apt/lists/*

# Install libspotify-dev from apt.mopidy.com
RUN wget -q -O - https://apt.mopidy.com/mopidy.gpg \
  | APT_KEY_DONT_WARN_ON_DANGEROUS_USAGE=DontWarn apt-key add - \
  && wget -q -O /etc/apt/sources.list.d/mopidy.list https://apt.mopidy.com/buster.list \
  && apt-get update \
  && apt-get install -y libspotify-dev \
  && rm -rf /var/lib/apt/lists/*

# Clone Iris from the repository and install in development mode.
# This allows a binding at "/iris" to map to your local folder for development, rather than
# installing using pip.
RUN git clone https://github.com/seppi91/Iris.git /iris \
 && cd /iris \
 && python3 setup.py develop \
 && mkdir -p /var/lib/mopidy/.config \
 && ln -s /config /var/lib/mopidy/.config/mopidy \
 # Allow mopidy user to run system commands (restart, local scan, etc)
 && echo "mopidy ALL=NOPASSWD: /iris/mopidy_iris/system.sh" >> /etc/sudoers

# Install additional Python dependencies
RUN python3 -m pip install --no-cache \
  tox \
  mopidy-mpd \
  mopidy-spotify \
  mopidy-local \
  Mopidy-TuneIn \
  Mopidy-Youtube \
  Mopidy-YTMusic \
  Mopidy-SoundCloud \
  Mopidy-Podcast \
  Mopidy-dLeyna \
  Mopidy-Jellyfin \
  Mopidy-MusicBox-Webclient \
  dbus-python \
  # pip not up-to-date for Mopidy-Tidal (https://github.com/tehkillerbee/mopidy-tidal/issues/14)
  git+https://github.com/tehkillerbee/mopidy-tidal.git@master

# Install further Python extensions - added by fork seppi91
RUN python3 -m pip install --no-cache \
  Mopidy-Party \
  Mopidy-radio-de \
  Mopidy-Scrobbler

# Start helper script.
COPY docker/entrypoint.sh /entrypoint.sh

# Default configuration.
COPY docker/mopidy.example.conf /config/mopidy.conf

# Copy the pulse-client configuratrion.
COPY docker/pulse-client.conf /etc/pulse/client.conf

# Add version info to image
COPY VERSION /

# Allows any user to run mopidy, but runs by default as a randomly generated UID/GID.
RUN useradd -ms /bin/bash mopidy
ENV HOME=/var/lib/mopidy
RUN set -ex \
 && usermod -G audio,sudo mopidy \
 && mkdir /var/lib/mopidy/local \
 && chown mopidy:audio -R $HOME /entrypoint.sh /iris \
 && chmod go+rwx -R $HOME /entrypoint.sh /iris \
 && echo "1" >> /IS_CONTAINER

# Runs as mopidy user by default.
USER mopidy:audio

VOLUME ["/var/lib/mopidy/local"]

EXPOSE 6600 6680 1704 1705 5555/udp

ENTRYPOINT ["/usr/bin/dumb-init", "/entrypoint.sh"]
CMD ["mopidy"]
