import classnames from "classnames"
import { Info } from "lucide-react"
import { useRepo, useTranslation } from "../../context"
import { SectionHeading } from "./SettingsCards"
import styles from "./style.module.scss"

export function AboutSection() {
  const { t } = useTranslation()
  const { gitVersion } = useRepo()

  return (
    <>
      <SectionHeading icon={<Info size={13} />} title={t("groupAbout")} />
      <div className={styles.settingsCard}>
        <span className={classnames(styles.settingsIcon, styles.sm)}>
          <Info size={15} />
        </span>
        <div className={styles.settingsMeta}>
          <strong>Reflog</strong>
          <p>
            {t("version")}: 0.1.0
            {gitVersion ? ` · git ${gitVersion}` : ""}
          </p>
        </div>
        <div className={styles.settingsControl} />
      </div>
    </>
  )
}
