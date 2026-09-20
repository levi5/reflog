import { Upload } from "lucide-react"
import { type ChangeEvent, type RefObject, useRef } from "react"
import { useTranslation } from "../../../context"

export interface ImportToolProps {
  onImportFile: (importFile: File) => void
  fileInputRef?: RefObject<HTMLInputElement | null>
  accept?: string
  label?: string
  className?: string
  disabled?: boolean
}

export function ImportTool({
  onImportFile,
  fileInputRef,
  accept = ".json,.toml",
  label,
  className,
  disabled,
}: ImportToolProps) {
  const { t } = useTranslation()
  const internalRef = useRef<HTMLInputElement>(null)
  const effectiveRef = fileInputRef ?? internalRef
  const buttonLabel = label ?? t("importRecipes")

  const handleFileInputChange = (changeEvent: ChangeEvent<HTMLInputElement>) => {
    const selectedFile = changeEvent.target.files?.[0]
    changeEvent.target.value = ""
    if (selectedFile) {
      onImportFile(selectedFile)
    }
  }

  const handlePickImportFile = () => {
    effectiveRef.current?.click()
  }

  return (
    <>
      <button
        type="button"
        className={className ?? "mini-btn"}
        onClick={handlePickImportFile}
        disabled={disabled}
        title={buttonLabel}
        aria-label={buttonLabel}
      >
        <Upload size={12} />
        <span>{buttonLabel}</span>
      </button>
      <input ref={effectiveRef} type="file" accept={accept} hidden onChange={handleFileInputChange} />
    </>
  )
}
