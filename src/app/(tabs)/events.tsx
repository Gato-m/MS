import { TabScreenContainer } from "../../components/TabScreenContainer";
import { ThemeText } from "../../components/ThemeText";

export default function EventsScreen() {
  return (
    <TabScreenContainer>
      <ThemeText variant="title">Events</ThemeText>
      <ThemeText variant="body">Dummy content for events tab.</ThemeText>
      <ThemeText variant="caption">
        Tabs refactored to component-based text.
      </ThemeText>
    </TabScreenContainer>
  );
}
