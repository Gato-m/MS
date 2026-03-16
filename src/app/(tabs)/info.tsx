import { TabScreenContainer } from "../../components/TabScreenContainer";
import { ThemeText } from "../../components/ThemeText";

export default function InfoScreen() {
  return (
    <TabScreenContainer>
      <ThemeText variant="title">Info</ThemeText>
      <ThemeText variant="subtitle">About this app</ThemeText>
      <ThemeText variant="body">Dummy content for info tab.</ThemeText>
    </TabScreenContainer>
  );
}
