"use client"
import { useRouter, useSearchParams } from "next/navigation";
import PropTypes from 'prop-types';

/**
 * @typedef {Object} Option
 * @property {string} value
 * @property {string} label
 */

/**
 * Select component for filtering data
 * @param {Object} props
 * @param {string} props.name - The name of the select field
 * @param {string} props.label - The label to display above the select
 * @param {Option[]} props.options - Array of options for the select
 * @param {boolean} [props.disabled] - Whether the select is disabled
 */
const Select = ({ name, label, options, disabled = false }) => {
  const router = useRouter();
  const searchParams = useSearchParams();
  const currentValue = searchParams.get(name);

  const handleChange = (e) => {
    const params = new URLSearchParams(searchParams.toString());
    if (e.target.value) {
      params.set(name, e.target.value);
    } else {
      params.delete(name);
    }
    router.push(`?${params.toString()}`);
  };

  return (
    <div className="flex flex-col gap-2">
      <label htmlFor={name} className="text-sm font-medium text-gray-700">
        {label}
      </label>
      <select
        id={name}
        name={name}
        disabled={disabled}
        value={currentValue ?? ""}
        onChange={handleChange}
        className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-indigo-500 focus:ring-indigo-500 sm:text-sm disabled:bg-gray-100"
      >
        <option value="">Select {label}</option>
        {options.map((option) => (
          <option key={option.value} value={option.value}>
            {option.label}
          </option>
        ))}
      </select>
    </div>
  );
};

Select.propTypes = {
  name: PropTypes.string.isRequired,
  label: PropTypes.string.isRequired,
  options: PropTypes.arrayOf(
    PropTypes.shape({
      value: PropTypes.string.isRequired,
      label: PropTypes.string.isRequired,
    })
  ).isRequired,
  disabled: PropTypes.bool,
};

export default Select;