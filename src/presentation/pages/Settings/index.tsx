import { FileCog, Settings as SettingsIcon } from "lucide-react"
import { AboutSection } from "./AboutSection"
import { GitConfigSection } from "./GitConfigSection"
import { InterfaceSection } from "./InterfaceSection"
import { ProfilesSection } from "./ProfilesSection"
import { Accordion } from "../../components/Accordion"
import { Header } from "../../components/Header"
import { useTranslation } from "../../context"

import styles from "./style.module.scss"

export function Settings() {
  const { t } = useTranslation()
  return (
    <div className={styles.settingsLayout}>
      <Header.Page icon={<SettingsIcon size={18} />} title="settings" description="settingsHint" />
      <InterfaceSection />
      <ProfilesSection />
      <Accordion title={t("gitConfigTitle")} icon={<FileCog size={15} />}>
        <GitConfigSection />
      </Accordion>
      <AboutSection />
    </div>
  )
}
