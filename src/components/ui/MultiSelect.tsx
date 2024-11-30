import Select from 'react-select';

interface MultiSelectProps {
  label: string;
  name: string;
  options: { label: string; value: number }[];
  value?: { label: string; value: number }[]; // Changed defaultValue to value for controlled input
  onChange: (selectedOptions: { label: string; value: number }[]) => void;
  error?: string;
}

const MultiSelect = ({
  label,
  name,
  options,
  value = [], // Use value instead of defaultValue for controlled behavior
  onChange,
  error,
}: MultiSelectProps) => {
  return (
    <div className="mb-4">
      <label htmlFor={name} className="block text-sm font-medium text-gray-700 mb-1">
        {label}
      </label>
      <Select
        id={name}
        isMulti
        options={options}
        value={value} // Control the component with value
        onChange={(selectedOptions) => {
          // Ensure that selectedOptions is not null and convert it to expected format
          onChange(selectedOptions ? (selectedOptions as { label: string; value: number }[]) : []);
        }}
        classNamePrefix="react-select"
        placeholder={`Select ${label.toLowerCase()}...`}
      />
      {error && <p className="text-red-500 text-xs mt-1">{error}</p>}
    </div>
  );
};

export default MultiSelect;
