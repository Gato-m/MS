import { ScrollView, StyleSheet } from "react-native";
import { TabScreenContainer } from "../../components/TabScreenContainer";
import { ThemeText } from "../../components/ThemeText";

export default function InfoScreen() {
  return (
    <TabScreenContainer>
      {/* Screen title */}
      <ThemeText variant="title" style={styles.screenTitle}>
        Drošība un {"\n"}pirmā palīdzība
      </ThemeText>

      <ScrollView>
        <ThemeText style={styles.infoSubTitleChip} variant="caption">
          Pirmā palīdzība
        </ThemeText>
        <ThemeText style={styles.infoText} variant="body">
          • Svētku teritorijā atrodas vairākas pirmās palīdzības teltis. {"\n"}•
          Tās ir atzīmētas kartē ar sarkanā krusta ikonu. {"\n"}• Medicīnas
          personāls pieejams visu pasākuma laiku. {"\n"}• Ja jūties slikti vai
          pamani cilvēku, kuram nepieciešama palīdzība, dodies uz tuvāko punktu
          vai informē brīvprātīgos. {"\n"}• Steidzamos gadījumos zvani 112.
        </ThemeText>
        <ThemeText style={styles.infoSubTitleChip} variant="caption">
          Policija
        </ThemeText>
        <ThemeText style={styles.infoText} variant="body">
          • Policijas patruļas atrodas visā svētku teritorijā. {"\n"}• Kartē tās
          redzamas ar zilo vairoga ikonu. {"\n"}• Ja esi liecinieks incidentam,
          zādzībai vai apdraudējumam, nekavējoties informē tuvāko policistu vai
          zvani 110. {"\n"}• Vari vērsties arī pie svētku personāla vai
          brīvprātīgajiem.
        </ThemeText>

        <ThemeText style={styles.infoSubTitleChip} variant="caption">
          Bērnu drošība
        </ThemeText>
        <ThemeText style={styles.infoText} variant="body">
          • Svētku laikā darbojas Bērnu drošības punkts, kur var saņemt
          palīdzību, ja bērns ir apmaldījies vai nepieciešama aprūpe.
          {"\n"}• Ja esi pazaudējis bērnu: {"\n"}◦ dodies uz tuvāko informācijas
          punktu, {"\n"}◦ informē brīvprātīgos vai apsardzi, {"\n"}• ja atrodies
          ar bērnu, kurš meklē savus vecākus, nogādā viņu drošības punktā vai
          informācijas centrā.
        </ThemeText>
      </ScrollView>
    </TabScreenContainer>
  );
}

const styles = StyleSheet.create({
  screenTitle: {
    textAlign: "left",
    marginBottom: 16,
    marginTop: 30,
  },
  infoText: {
    marginVertical: 10,
    textAlign: "left",
  },
  infoSubTitleChip: {
    alignSelf: "flex-start",
    marginTop: 10,
    borderRadius: 20,
    paddingHorizontal: 16,
    paddingVertical: 8,
    backgroundColor: "#c51117",
    color: "#FFFFFF",
    fontSize: 14,
    fontWeight: "700",
    lineHeight: 18,
    marginVertical: 0,
    textAlign: "center",
  },
});
