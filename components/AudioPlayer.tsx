//components/AudioPlayer.tsx
import { Ionicons } from "@expo/vector-icons";
import { Audio } from "expo-av";
import { useEffect, useState } from "react";
import { TouchableOpacity, View, Text, StyleSheet } from "react-native";

const formatTime = (millis: number) => {
  const totalSeconds = Math.floor(millis / 1000);
  const minutes = Math.floor(totalSeconds / 60);
  const seconds = totalSeconds % 60;
  return `${minutes}:${seconds < 10 ? "0" : ""}${seconds}`;
};

// Global variable để track audio hiện tại đang chạy
let globalCurrentSound: Audio.Sound | null = null;
let globalSetIsPlaying: ((playing: boolean) => void) | null = null;

const AudioPlayer = ({ uri }: { uri: string }) => {
  const [sound, setSound] = useState<Audio.Sound | null>(null);
  const [isPlaying, setIsPlaying] = useState(false);
  const [position, setPosition] = useState(0); // ms
  const [duration, setDuration] = useState(0); // ms

  // Load audio và lấy duration khi component mount
  useEffect(() => {
    let soundObj: Audio.Sound | null = null;
    
    const loadAudio = async () => {
      try {
        const { sound: s, status } = await Audio.Sound.createAsync(
          { uri },
          { shouldPlay: false },
          onPlaybackStatusUpdate,
          true // downloadFirst
        );
        soundObj = s;
        setSound(s);
        
        if (status.isLoaded && status.durationMillis) {
          setDuration(status.durationMillis);
        }
      } catch (error) {
        console.error("Error loading audio:", error);
      }
    };

    loadAudio();

    return () => {
      if (soundObj) {
        soundObj.unloadAsync();
      }
    };
  }, [uri]);

  // Callback để update trạng thái playback
  const onPlaybackStatusUpdate = (status: any) => {
    if (status.isLoaded) {
      setPosition(status.positionMillis || 0);
      setDuration(status.durationMillis || 0);

      // Khi audio chạy xong
      if (status.didJustFinish) {
        setIsPlaying(false);
        setPosition(0);
        // Reset về đầu
        if (sound) {
          sound.setPositionAsync(0);
        }
        // Clear global reference nếu đây là audio đang chạy
        if (globalCurrentSound === sound) {
          globalCurrentSound = null;
          globalSetIsPlaying = null;
        }
      }
    }
  };

  const togglePlay = async () => {
    try {
      // Nếu có audio khác đang chạy, dừng nó
      if (globalCurrentSound && globalCurrentSound !== sound) {
        await globalCurrentSound.pauseAsync();
        await globalCurrentSound.setPositionAsync(0);
        if (globalSetIsPlaying) {
          globalSetIsPlaying(false);
        }
      }

      if (!sound) return;

      if (isPlaying) {
        // Pause audio hiện tại
        await sound.pauseAsync();
        setIsPlaying(false);
        globalCurrentSound = null;
        globalSetIsPlaying = null;
      } else {
        // ✅ Đảm bảo audio ở vị trí đúng trước khi play
        if (position === 0 || position >= duration) {
          await sound.setPositionAsync(0);
        }
        // Play audio
        await sound.playAsync();
        setIsPlaying(true);
        // Set global references
        globalCurrentSound = sound;
        globalSetIsPlaying = setIsPlaying;
      }
    } catch (error) {
      console.error("Error toggling audio playback:", error);
    }
  };

  // Reset audio về đầu khi component unmount hoặc audio khác được chạy
  useEffect(() => {
    return () => {
      if (globalCurrentSound === sound) {
        globalCurrentSound = null;
        globalSetIsPlaying = null;
      }
    };
  }, [sound]);

  // Listener để reset trạng thái khi audio khác được chạy
  useEffect(() => {
    const checkGlobalAudio = () => {
      if (globalCurrentSound !== sound && isPlaying) {
        setIsPlaying(false);
        setPosition(0);
        if (sound) {
          sound.setPositionAsync(0);
        }
      }
    };

    const interval = setInterval(checkGlobalAudio, 100);
    return () => clearInterval(interval);
  }, [sound, isPlaying]);

  return (
    <View style={styles.container}>
      <TouchableOpacity onPress={togglePlay}>
        <Ionicons
          name={isPlaying ? "pause-circle" : "play-circle"}
          size={36}
          color="#fff"
        />
      </TouchableOpacity>
      <Text style={styles.time}>
        {formatTime(position)} / {formatTime(duration)}
      </Text>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flexDirection: "row",
    alignItems: "center",
    gap: 10,
  },
  time: {
    fontSize: 14,
    color: "#555",
  },
});

export default AudioPlayer;
