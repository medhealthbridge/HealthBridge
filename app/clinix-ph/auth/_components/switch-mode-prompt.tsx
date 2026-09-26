type SwitchModePromptProps = { prompt: string; action: string; onSwitch: () => void };

export function SwitchModePrompt({ prompt, action, onSwitch }: SwitchModePromptProps) {
  return (
    <p className="text-center text-sm text-slate-600">
      {prompt}{" "}
      <button
        type="button"
        onClick={onSwitch}
        className="cursor-pointer font-semibold text-brand underline-offset-4 hover:underline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-brand"
      >
        {action}
      </button>
    </p>
  );
}
