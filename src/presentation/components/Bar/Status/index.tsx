import classnames from "classnames"
import {
  CircleCheck,
  FileDiff,
  FolderGit2,
  GitBranch,
  ShieldCheck,
  ShieldX,
  TriangleAlert,
  UserRound,
} from "lucide-react"
import { gpgVerified, shortVersion, sshHost } from "../../../../main/adapters"
import { useTranslation } from "../../../context"
import styles from "./style.module.scss"

interface Props {
  root: string
  branch: string
  ahead: number
  behind: number
  merging: boolean
  cherryPicking?: boolean
  reverting?: boolean
  unmergedCount: number
  changedCount: number
  profileName: string
  profileEmoji: string
  remoteUrl: string
  gitVersion: string
  gpg: string
}

export function StatusBar(props: Props) {
  const {
    root,
    branch,
    ahead,
    behind,
    merging,
    cherryPicking,
    reverting,
    unmergedCount,
    changedCount,
    profileName,
    profileEmoji,
    remoteUrl,
    gitVersion,
    gpg,
  } = props
  const { t } = useTranslation()
  const verified = gpgVerified(gpg)
  const remote = remoteUrl.includes("@") ? remoteUrl : sshHost(remoteUrl)
  const danger = merging || cherryPicking || reverting || unmergedCount > 0
  const tone = danger ? "tone-danger" : changedCount > 0 ? "tone-warn" : "tone-clean"
  return (
    <footer className={classnames(styles.statusbar, styles[tone])} data-tone={tone}>
      <span className={styles.sbPath} title={root}>
        <FolderGit2 size={12} /> {root}
      </span>
      <span className={styles.sbBranch}>
        <GitBranch size={12} /> {branch}{" "}
        <span className={styles.sbTrack}>
          [ahead {ahead}, behind {behind}]
        </span>
      </span>
      <div className="spacer" />
      {merging ? (
        <span className={styles.sbMerge}>
          <TriangleAlert size={12} /> {t("mergeInProgress")}
        </span>
      ) : cherryPicking ? (
        <span className={styles.sbMerge}>
          <TriangleAlert size={12} /> {t("cherryPickInProgress")}
        </span>
      ) : reverting ? (
        <span className={styles.sbMerge}>
          <TriangleAlert size={12} /> {t("revertInProgress")}
        </span>
      ) : unmergedCount > 0 ? (
        <span className={styles.sbWarn} title={t("mergeConflictsTab")}>
          <TriangleAlert size={12} /> {unmergedCount}
        </span>
      ) : (
        <span className={styles.sbClean} title={t("cleanHint")}>
          <CircleCheck size={12} /> {t("clean")}
        </span>
      )}
      {changedCount > 0 && (
        <span className={styles.sbFiles} title={t("stagingDiff")}>
          <FileDiff size={12} /> {changedCount}
        </span>
      )}
      {profileName && (
        <span className={styles.sbProfile} title={t("profiles")}>
          {profileEmoji ? `${profileEmoji} ` : <UserRound size={12} />}
          {profileName}
        </span>
      )}
      {gpg && (
        <span className={classnames(styles.sbGpg, verified && styles.ok)}>
          {verified ? <ShieldCheck size={12} /> : <ShieldX size={12} />}{" "}
          {verified ? t("gpgVerified") : t("gpgUnverified")}
        </span>
      )}
      {remoteUrl && <span className={styles.sbRemote}>ssh: {remote}</span>}
      {gitVersion && <span className={styles.sbGit}>git {shortVersion(gitVersion)}</span>}
    </footer>
  )
}
