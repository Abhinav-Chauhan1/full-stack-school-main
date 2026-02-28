import { FieldError } from "react-hook-form";

type InputFieldProps = {
  label: string;
  type?: string;
  register: any;
  name: string;
  defaultValue?: string | number;
  error?: FieldError;
  hidden?: boolean;
  inputProps?: React.InputHTMLAttributes<HTMLInputElement>;
};

const InputField = ({
  label,
  type = "text",
  register,
  name,
  defaultValue,
  error,
  hidden,
  inputProps,
}: InputFieldProps) => {
  // Convert ISO date to dd/mm/yyyy for date inputs
  const formatDefaultValue = () => {
    if (type === "date" && defaultValue && typeof defaultValue === "string") {
      const [year, month, day] = defaultValue.split("-");
      if (year && month && day) {
        return `${day}/${month}/${year}`;
      }
    }
    return defaultValue;
  };

  // For date type, use text input with dd/mm/yyyy format
  const inputType = type === "date" ? "text" : type;
  const placeholder = type === "date" ? "DD/MM/YYYY" : undefined;

  return (
    <div className={hidden ? "hidden" : "flex flex-col gap-2 w-full md:w-1/4"}>
      <label className="text-xs text-gray-500">{label}</label>
      <input
        type={inputType}
        placeholder={placeholder}
        {...register(name, type === "date" ? {
          setValueAs: (value: string) => {
            if (!value) return undefined;
            // Convert dd/mm/yyyy to yyyy-mm-dd for storage
            const parts = value.split("/");
            if (parts.length === 3) {
              const [day, month, year] = parts;
              return `${year}-${month.padStart(2, "0")}-${day.padStart(2, "0")}`;
            }
            return value;
          },
        } : {})}
        className="ring-[1.5px] ring-gray-300 p-2 rounded-md text-sm w-full"
        {...inputProps}
        defaultValue={formatDefaultValue()}
        onKeyPress={type === "date" ? (e) => {
          // Only allow numbers and forward slash for date inputs
          if (!/[\d/]/.test(e.key)) {
            e.preventDefault();
          }
        } : undefined}
      />
      {error?.message && (
        <p className="text-xs text-red-400">{error.message.toString()}</p>
      )}
    </div>
  );
};

export default InputField;
