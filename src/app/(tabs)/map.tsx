import { TabScreenContainer } from "../../components/TabScreenContainer";
import { ThemeText } from "../../components/ThemeText";

export default function MapScreen() {
  return (
    <TabScreenContainer>
      <ThemeText variant="title">Map</ThemeText>
      <ThemeText variant="body">Dummy content for map tab.</ThemeText>
      <ThemeText variant="caption">ThemeText variant: caption.</ThemeText>
    </TabScreenContainer>
  );
}
