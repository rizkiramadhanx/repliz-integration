import { forwardRef, useRef, useCallback, useEffect } from "react";
import { useMantineColorScheme, useMantineTheme } from "@mantine/core";
import AsyncSelect from "react-select/async";
import {
  StylesConfig,
  MultiValue,
  SingleValue,
  ActionMeta,
} from "react-select";

// Type definitions for options halo
export type OptionType = { value: string; label: string };

export interface ReactAsyncSelectProps {
  loadOptions: (inputValue: string) => Promise<OptionType[]>;
  value?: OptionType | readonly OptionType[] | null;
  onChange?: (
    value: MultiValue<OptionType> | SingleValue<OptionType>,
    actionMeta: ActionMeta<OptionType>,
  ) => void;
  onBlur?: () => void;
  defaultOptions?: boolean | OptionType[];
  cacheOptions?: boolean;
  isClearable?: boolean;
  isMulti?: boolean;
  isDisabled?: boolean;
  isLoading?: boolean;
  placeholder?: string;
  error?: string;
  debounceTimeout?: number; // Default 500ms
  defaultValue?: OptionType | readonly OptionType[] | null;
}

export const ReactAsyncSelect = forwardRef<any, ReactAsyncSelectProps>(
  function ReactAsyncSelect(props, ref) {
    const { colorScheme } = useMantineColorScheme();
    const theme = useMantineTheme();
    const isDarkMode = colorScheme === "dark";
    const {
      error,
      loadOptions,
      debounceTimeout = 500,
      isLoading,
      defaultValue,
      ...restProps
    } = props;
    const primaryColor = theme.colors.primary;

    // Debounce implementation
    const debounceTimerRef = useRef<NodeJS.Timeout | null>(null);

    const debouncedLoadOptions = useCallback(
      (inputValue: string, callback: (options: OptionType[]) => void) => {
        if (debounceTimerRef.current) {
          clearTimeout(debounceTimerRef.current);
        }

        debounceTimerRef.current = setTimeout(async () => {
          if (isLoading) {
            callback([]);
            return;
          }
          try {
            const options = await loadOptions(inputValue);
            callback(options);
          } catch (error) {
            console.error("Error loading options:", error);
            callback([]);
          }
        }, debounceTimeout);
      },
      [loadOptions, debounceTimeout],
    );

    // Cleanup timeout on unmount
    useEffect(() => {
      return () => {
        if (debounceTimerRef.current) {
          clearTimeout(debounceTimerRef.current);
        }
      };
    }, []);

    const customStyles: StylesConfig<OptionType, boolean> = {
      container: (base) => ({
        ...base,
        width: "100%",
      }),
      control: (base, state) => ({
        ...base,
        minHeight: "36px",
        borderColor: error
          ? theme.colors.red[6]
          : state.isFocused
            ? primaryColor[6]
            : isDarkMode
              ? theme.colors.dark[4]
              : theme.colors.primary[7],
        boxShadow: state.isFocused
          ? `0 0 0 1px ${primaryColor[6]}`
          : base.boxShadow,
        "&:hover": {
          borderColor: error
            ? theme.colors.red[6]
            : state.isFocused
              ? primaryColor[6]
              : isDarkMode
                ? theme.colors.dark[3]
                : theme.colors.gray[5],
        },
        backgroundColor: isDarkMode ? theme.colors.dark[6] : theme.white,
        borderRadius: theme.radius.sm,
        fontSize: theme.fontSizes.sm,
      }),
      input: (base) => ({
        ...base,
        color: isDarkMode ? theme.white : theme.black,
        fontSize: theme.fontSizes.sm,
      }),
      placeholder: (base) => ({
        ...base,
        color: isDarkMode ? theme.colors.dark[2] : theme.colors.gray[5],
        fontSize: theme.fontSizes.sm,
      }),
      option: (base, state) => ({
        ...base,
        backgroundColor: state.isSelected
          ? primaryColor[6]
          : state.isFocused
            ? isDarkMode
              ? theme.colors.dark[5]
              : theme.colors.gray[0]
            : isDarkMode
              ? theme.colors.dark[6]
              : theme.white,
        color: state.isSelected
          ? theme.white
          : isDarkMode
            ? theme.colors.dark[0]
            : theme.black,
        fontSize: theme.fontSizes.sm,
        padding: "8px 12px",
        cursor: "pointer",
        "&:active": {
          backgroundColor: primaryColor[7],
        },
      }),
      menu: (base) => ({
        ...base,
        backgroundColor: isDarkMode ? theme.colors.dark[6] : theme.white,
        borderRadius: theme.radius.sm,
        marginTop: 4,
        boxShadow: theme.shadows.md,
        border: `1px solid ${
          isDarkMode ? theme.colors.dark[4] : theme.colors.gray[3]
        }`,
        zIndex: 1000,
      }),
      menuList: (base) => ({
        ...base,
        padding: 4,
      }),
      clearIndicator: (base) => ({
        ...base,
        color: isDarkMode ? theme.colors.dark[2] : theme.colors.gray[6],
        cursor: "pointer",
        "&:hover": {
          color: theme.colors.red[6],
        },
      }),
      dropdownIndicator: (base) => ({
        ...base,
        color: isDarkMode ? theme.colors.dark[2] : theme.colors.gray[6],
        cursor: "pointer",
        "&:hover": {
          color: isDarkMode ? theme.colors.dark[0] : theme.colors.gray[7],
        },
      }),
      indicatorSeparator: (base) => ({
        ...base,
        backgroundColor: isDarkMode
          ? theme.colors.dark[4]
          : theme.colors.gray[3],
      }),
      singleValue: (base, state) => ({
        ...base,
        color: isDarkMode ? theme.white : theme.black,
        opacity: state.isDisabled ? 0.5 : 1,
        fontSize: theme.fontSizes.sm,
      }),
      multiValue: (base) => ({
        ...base,
        backgroundColor: isDarkMode
          ? theme.colors.dark[5]
          : theme.colors.gray[1],
        borderRadius: theme.radius.sm,
      }),
      multiValueLabel: (base) => ({
        ...base,
        color: isDarkMode ? theme.colors.dark[0] : theme.black,
        fontSize: theme.fontSizes.sm,
      }),
      multiValueRemove: (base) => ({
        ...base,
        color: isDarkMode ? theme.colors.dark[2] : theme.colors.gray[6],
        cursor: "pointer",
        "&:hover": {
          backgroundColor: theme.colors.red[6],
          color: theme.white,
        },
      }),
      loadingIndicator: (base) => ({
        ...base,
        color: primaryColor[6],
      }),
      noOptionsMessage: (base) => ({
        ...base,
        color: isDarkMode ? theme.colors.dark[2] : theme.colors.gray[6],
        fontSize: theme.fontSizes.sm,
      }),
      loadingMessage: (base) => ({
        ...base,
        color: isDarkMode ? theme.colors.dark[2] : theme.colors.gray[6],
        fontSize: theme.fontSizes.sm,
      }),
    };

    return (
      <div style={{ width: "100%" }}>
        <AsyncSelect<OptionType, boolean>
          loadOptions={debouncedLoadOptions}
          styles={customStyles}
          noOptionsMessage={({ inputValue }) =>
            inputValue ? "Tidak ada pilihan" : "Ketik untuk mencari..."
          }
          loadingMessage={() => "Memuat..."}
          placeholder="Pilih..."
          {...restProps}
          ref={ref}
          defaultValue={defaultValue}
        />
        {error && (
          <div
            style={{
              color: theme.colors.red[6],
              fontSize: theme.fontSizes.xs,
              marginTop: 4,
            }}
          >
            {error}
          </div>
        )}
      </div>
    );
  },
);

export default ReactAsyncSelect;
