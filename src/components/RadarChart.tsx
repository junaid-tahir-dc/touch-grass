import React, { FC } from 'react';
import { View, Text, Image, Dimensions, StyleSheet } from 'react-native';
import { RadarChart } from 'react-native-gifted-charts';

const { width } = Dimensions.get('window');

interface RadarProfileChartProps {
  data?: number[];
  labels?: string[];
  profileImage?: string;
  userProfile?: any;
}

const defaultData = [10, 10, 10, 10, 10];
const defaultLabels = [
  'TOTAL XP',
  'CHALLENGES COMPLETED',
  'DAY STREAK',
  'MONTHS OF MEMBERSHIP',
  'LEVEL',
];

const RadarProfileChart: FC<RadarProfileChartProps> = ({
  data = defaultData,
  labels = defaultLabels,
  profileImage = 'https://randomuser.me/api/portraits/men/41.jpg',
  userProfile,
}) => {
  const radius = width * 0.35;
  const center = width * 0.425;
  const totalPoints = data.length;

  // position badges on the chart edge (max radius)
  const getBadgePosition = (index: number) => {
    const angle = (Math.PI * 2 * index) / totalPoints - Math.PI / 2;
    const r = radius * 1.05; // slightly outside edge
    const x = center + r * Math.cos(angle);
    const y = center + r * Math.sin(angle);
    return { x, y };
  };

  const renderBackgroundCircles = () => {
    const circleCount = 5;
    const step = radius / circleCount;
    return Array.from({ length: circleCount }, (_, i) => (
      <View
        key={`circle-${i}`}
        style={{
          position: 'absolute',
          width: (i + 1) * step * 2,
          height: (i + 1) * step * 2,
          borderRadius: (i + 1) * step,
          borderWidth: 1,
          borderColor: '#e6e6e6',
        }}
      />
    ));
  };

  return (
    <View style={styles.container}>
      <Text style={styles.welcomeText}>WELCOME BACK,</Text>
      <Text style={styles.username}>
        {(userProfile?.username || 'SCOTTD1989').toUpperCase()}!
      </Text>

      <View style={styles.chartWrapper}>
        {/* Background Rings */}
        {renderBackgroundCircles()}

        {/* Radar Chart */}
        <RadarChart
          data={data}
          labels={labels}
          maxValue={10}
          showPolygonLines
          showInnerLines={false}
          strokeColor="#A0D911"
          fillColor="rgba(160, 217, 17, 0.15)"
          labelColor="#ffff"
          labelFontSize={8}
          labelWidth={90}
          labelTextStyle={{ fontWeight: '600' }}
          containerStyle={styles.chartContainer}
        />

        {/* Number Badges at Chart Edge */}
        {data.map((value, index) => {
          const { x, y } = getBadgePosition(index);
          return (
            <View
              key={`badge-${index}`}
              style={[
                styles.badge,
                {
                  top: y - 14,
                  left: x - 14,
                },
              ]}
            >
              <Text style={styles.badgeText}>{value}</Text>
            </View>
          );
        })}

        {/* Center Profile Image */}
        <View style={styles.profileContainer}>
          <Image
            source={{ uri: profileImage }}
            style={styles.profileImage}
            resizeMode="cover"
          />
        </View>
      </View>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    alignItems: 'center',
    paddingVertical: 20,
  },
  welcomeText: {
    fontSize: 18,
    fontWeight: '700',
    textAlign: 'center',
    color: '#111',
    marginBottom: 2,
  },
  username: {
    fontSize: 18,
    fontWeight: '700',
    textAlign: 'center',
    color: '#111',
    marginBottom: 10,
  },
  chartWrapper: {
    position: 'relative',
    width: width * 0.85,
    height: width * 0.85,
    justifyContent: 'center',
    alignItems: 'center',
  },
  chartContainer: {
    width: '100%',
    height: '100%',
  },
  profileContainer: {
    position: 'absolute',
    width: 90,
    height: 90,
    borderRadius: 45,
    overflow: 'hidden',
    borderWidth: 3,
    borderColor: '#fff',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.15,
    shadowRadius: 4,
    elevation: 5,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: '#fff',
  },
  profileImage: {
    width: '100%',
    height: '100%',
    borderRadius: 45,
  },
  badge: {
    position: 'absolute',
    width: 28,
    height: 28,
    borderRadius: 14,
    backgroundColor: '#D8FA5A',
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 1,
    borderColor: '#C5EA4D',
  },
  badgeText: {
    fontSize: 13,
    fontWeight: '700',
    color: '#000',
  },
});

export default RadarProfileChart;
