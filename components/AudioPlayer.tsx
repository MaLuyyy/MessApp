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

const AudioPlayer = ({ uri }: { uri: string }) => {
  const [sound, setSound] = useState<Audio.Sound | null>(null);
  const [isPlaying, setIsPlaying] = useState(false);
  const [position, setPosition] = useState(0); // ms
  const [duration, setDuration] = useState(0); // ms

  // 🔹 Load duration khi mount
  useEffect(() => {
    let soundObj: Audio.Sound | null = null;
    (async () => {
      const { sound: s, status } = await Audio.Sound.createAsync(
        { uri },
        { shouldPlay: false }, // chỉ load metadata
        undefined,
        true // downloadFirst
      );
      soundObj = s;
      setSound(s);
      if (status.isLoaded && status.durationMillis) {
        setDuration(status.durationMillis);
      }
    })();

    return () => {
      if (soundObj) soundObj.unloadAsync();
    };
  }, [uri]);

  const togglePlay = async () => {
    if (!sound) {
      const { sound: newSound } = await Audio.Sound.createAsync({ uri });
      setSound(newSound);
      await newSound.playAsync();
      setIsPlaying(true);

      newSound.setOnPlaybackStatusUpdate((status: any) => {
        if (status.isLoaded) {
          setPosition(status.positionMillis || 0);
          setDuration(status.durationMillis || 0);

          if (status.didJustFinish) {
            setIsPlaying(false);
            newSound.unloadAsync();
            setSound(null);
          }
        }
      });
    } else {
      if (isPlaying) {
        await sound.pauseAsync();
        setIsPlaying(false);
      } else {
        await sound.playAsync();
        setIsPlaying(true);
      }
    }
  };

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
