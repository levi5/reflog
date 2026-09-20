import styles from "./style.module.scss"

interface VariablesEditorProps {
  variableNames: string[]
  variableValues: Record<string, string>
  onVariableValuesChange: (values: Record<string, string>) => void
}

export function VariablesEditor({ variableNames, variableValues, onVariableValuesChange }: VariablesEditorProps) {
  if (variableNames.length === 0) return null
  return (
    <div className={styles.variablesEditor}>
      {variableNames.map((variableName) => (
        <input
          key={variableName}
          value={variableValues[variableName] ?? ""}
          placeholder={`{{${variableName}}}`}
          aria-label={variableName}
          onChange={(changeEvent) =>
            onVariableValuesChange({
              ...variableValues,
              [variableName]: changeEvent.target.value,
            })
          }
        />
      ))}
    </div>
  )
}
