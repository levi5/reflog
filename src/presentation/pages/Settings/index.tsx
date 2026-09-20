import { Settings as SettingsIcon } from "lucide-react"
import { AboutSection } from "./AboutSection"
import { InterfaceSection } from "./InterfaceSection"
import { ProfilesSection } from "./ProfilesSection"
import { Header } from "../../components/Header"

import styles from "./style.module.scss"

export function Settings() {
  return (
    <div className={styles.settingsLayout}>
      <Header.Page icon={<SettingsIcon size={18} />} title="settings" description="settingsHint" />
      <InterfaceSection />
      <ProfilesSection />
      <AboutSection />
    </div>
  )
}
