import classnames from "classnames"
import { CaseSensitive, History, Languages, Palette, SlidersHorizontal } from "lucide-react"
import { useEffect, useState } from "react"
import { Select, type SelectOption } from "../../components/Select"
import { Switch } from "../../components/Switch"
import { useSettingsContext, useTranslation } from "../../context"
import type { StringKey } from "../../../i18n"
import { clamp } from "../../../shared/utils/number"
import { DEFAULT_FONT_SIZE, type Lang, MAX_FONT_SIZE, MIN_FONT_SIZE, type Theme } from "../../../types"
import { SectionHeading, SettingCard } from "./SettingsCards"
import styles from "./style.module.scss"

function clampFontSize(value: number): number {
  return clamp(value, MIN_FONT_SIZE, MAX_FONT_SIZE)
}

function parseFontSizeInput(rawValue: string): number | null {
  const parsedValue = Number.parseInt(rawValue, 10)
  if (Number.isNaN(parsedValue)) return null
  return parsedValue
}

const LANG_MAP: Record<string, Lang> = { en: "en", pt: "pt" }
function normalizeLanguage(value: string): Lang {
  return LANG_MAP[value] ?? "pt"
}

const THEME_MAP: Record<string, Theme> = {
  light: "light",
  dark: "dark",
  "glass-dark": "glass-dark",
  "glass-light": "glass-light",
}
function normalizeTheme(value: string): Theme {
  return THEME_MAP[value] ?? "dark"
}

function buildLanguageOptions(): SelectOption[] {
  return [
    { value: "pt", label: "Português (BR)" },
    { value: "en", label: "English" },
  ]
}

function buildThemeOptions(t: (key: StringKey) => string): SelectOption[] {
  const labelByTheme: Record<Theme, StringKey> = {
    dark: "dark",
    light: "light",
    "glass-dark": "glassDark",
    "glass-light": "glassLight",
  }
  const themeValues: Theme[] = ["dark", "light", "glass-dark", "glass-light"]
  return themeValues.map((themeValue) => ({
    value: themeValue,
    label: t(labelByTheme[themeValue]),
  }))
}

export function InterfaceSection() {
  const { lang, theme, fontSize, reopenLastRepo, setLang, setTheme, setFontSize, setReopenLastRepo } =
    useSettingsContext()
  const { t } = useTranslation()

  const handleLanguageChange = (selectedValue: string) => {
    setLang(normalizeLanguage(selectedValue))
  }

  const handleThemeChange = (selectedValue: string) => {
    setTheme(normalizeTheme(selectedValue))
  }

  return (
    <>
      <SectionHeading icon={<SlidersHorizontal size={13} />} title={t("groupInterface")} />
      <LanguageSettingCard currentLanguage={lang} onLanguageChange={handleLanguageChange} />
      <ThemeSettingCard currentTheme={theme} onThemeChange={handleThemeChange} />
      <FontSizeSettingCard currentFontSize={fontSize} onFontSizeChange={setFontSize} />
      <ReopenLastSettingCard checked={reopenLastRepo} onCheckedChange={setReopenLastRepo} />
    </>
  )
}

function LanguageSettingCard({
  currentLanguage,
  onLanguageChange,
}: {
  currentLanguage: Lang
  onLanguageChange: (nextLanguage: Lang) => void
}) {
  const { t } = useTranslation()
  return (
    <SettingCard icon={<Languages size={15} />} title={t("language")} hint={t("settingsLangHint")}>
      <Select
        label={t("language")}
        value={currentLanguage}
        options={buildLanguageOptions()}
        onChange={(selectedValue) => onLanguageChange(normalizeLanguage(selectedValue))}
      />
    </SettingCard>
  )
}

function ThemeSettingCard({
  currentTheme,
  onThemeChange,
}: {
  currentTheme: Theme
  onThemeChange: (nextTheme: Theme) => void
}) {
  const { t } = useTranslation()
  return (
    <SettingCard icon={<Palette size={15} />} title={t("theme")} hint={t("settingsThemeHint")}>
      <span className={classnames(styles.themeDot, styles[currentTheme])} />
      <Select
        label={t("theme")}
        value={currentTheme}
        options={buildThemeOptions(t)}
        onChange={(selectedValue) => onThemeChange(normalizeTheme(selectedValue))}
      />
    </SettingCard>
  )
}

function ReopenLastSettingCard({
  checked,
  onCheckedChange,
}: {
  checked: boolean
  onCheckedChange: (nextChecked: boolean) => void
}) {
  const { t } = useTranslation()
  return (
    <SettingCard icon={<History size={15} />} title={t("reopenLastRepo")} hint={t("reopenLastRepoHint")}>
      <Switch checked={checked} onChange={onCheckedChange} ariaLabel={t("reopenLastRepo")} />
    </SettingCard>
  )
}

function FontSizeSettingCard({
  currentFontSize,
  onFontSizeChange,
}: {
  currentFontSize: number
  onFontSizeChange: (nextFontSize: number) => void
}) {
  const { t } = useTranslation()
  const [draftValue, setDraftValue] = useState(String(currentFontSize))

  useEffect(() => {
    setDraftValue(String(currentFontSize))
  }, [currentFontSize])

  const commitFontSize = (rawValue: string) => {
    const parsedValue = parseFontSizeInput(rawValue)
    if (parsedValue === null) {
      setDraftValue(String(currentFontSize))
      return
    }
    const clampedSize = clampFontSize(parsedValue)
    setDraftValue(String(clampedSize))
    if (clampedSize !== currentFontSize) onFontSizeChange(clampedSize)
  }

  const handleResetFontSize = () => {
    onFontSizeChange(DEFAULT_FONT_SIZE)
  }

  return (
    <SettingCard icon={<CaseSensitive size={15} />} title={t("fontSize")} hint={t("settingsFontHint")}>
      <input
        className={styles.fontInput}
        type="number"
        aria-label={t("fontSize")}
        min={MIN_FONT_SIZE}
        max={MAX_FONT_SIZE}
        step={1}
        value={draftValue}
        onChange={(changeEvent) => setDraftValue(changeEvent.target.value)}
        onBlur={(blurEvent) => commitFontSize(blurEvent.target.value)}
        onKeyDown={(keyboardEvent) => {
          if (keyboardEvent.key !== "Enter") return
          commitFontSize(draftValue)
        }}
      />
      <span className={styles.fontUnit}>px</span>
      <button
        className="mini-btn"
        type="button"
        title={t("reset")}
        disabled={currentFontSize === DEFAULT_FONT_SIZE}
        onClick={handleResetFontSize}
      >
        {t("reset")}
      </button>
    </SettingCard>
  )
}
