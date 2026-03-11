import React from "react";
import { Text, View } from "react-native";
import Svg, { Circle, Defs, LinearGradient, Stop } from "react-native-svg";

interface CountdownUnitProps {
  value: number;
  label: string;
  max: number;
}

export const CountdownUnit = ({ value, label, max }: CountdownUnitProps) => {
  const radius = 45;
  const circumference = 2 * Math.PI * radius;
  const strokeDashoffset = circumference - (value / max) * circumference;

  return (
    <View className="items-center justify-center mx-2">
      <View className="w-24 h-24 items-center justify-center">
        {/* Cam Efekti Arka Plan */}
        <View className="absolute w-full h-full rounded-full bg-black/40 border border-white/10 shadow-2xl" />

        <Svg width="100" height="100" viewBox="0 0 110 110">
          <Defs>
            <LinearGradient id="grad" x1="0%" y1="0%" x2="100%" y2="100%">
              <Stop offset="0%" stopColor="#FF4D00" stopOpacity="1" />
              <Stop offset="100%" stopColor="#FF8700" stopOpacity="0.3" />
            </LinearGradient>
          </Defs>

          {/* Arka Gri Halka */}
          <Circle
            cx="55"
            cy="55"
            r={radius}
            stroke="#1A1A1A"
            strokeWidth="6"
            fill="transparent"
          />

          {/* Parlayan Turuncu Halka */}
          <Circle
            cx="55"
            cy="55"
            r={radius}
            stroke="url(#grad)"
            strokeWidth="6"
            fill="transparent"
            strokeDasharray={circumference}
            strokeDashoffset={strokeDashoffset}
            strokeLinecap="round"
            transform="rotate(-90 55 55)"
          />
        </Svg>

        {/* Sayı */}
        <View className="absolute">
          <Text
            className="text-3xl font-bold text-[#FF4D00]"
            style={{ fontFamily: "monospace" }}
          >
            {value < 10 ? `0${value}` : value}
          </Text>
        </View>
      </View>

      {/* Etiket (DAYS, HRS vs) */}
      <View className="mt-4 px-4 py-1 rounded-full bg-[#1A1A1A] border border-[#FF4D00]/30 shadow-lg">
        <Text className="text-[10px] font-bold text-[#FF4D00] tracking-widest">
          {label.toUpperCase()}
        </Text>
      </View>
    </View>
  );
};
