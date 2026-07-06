import { useEffect, useState } from "react";
import {
  NumberInput,
  Select,
  SegmentedControl,
  Stack,
  Text,
  TextInput,
} from "@mantine/core";
import { TimeInput } from "@mantine/dates";

const DAY_OPTIONS = [
  { value: "0", label: "Minggu" },
  { value: "1", label: "Senin" },
  { value: "2", label: "Selasa" },
  { value: "3", label: "Rabu" },
  { value: "4", label: "Kamis" },
  { value: "5", label: "Jumat" },
  { value: "6", label: "Sabtu" },
];

function buildCronFromPreset(
  mode: "hourly" | "daily" | "weekly",
  time: string,
  day: string,
  hourInterval: number,
): string {
  const [hour, minute] = time.split(":").map((v) => parseInt(v, 10) || 0);
  if (mode === "hourly") {
    return `${minute} */${hourInterval} * * *`;
  }
  if (mode === "weekly") {
    return `${minute} ${hour} * * ${day}`;
  }
  return `${minute} ${hour} * * *`;
}

export default function ScheduleFields({
  value,
  onChange,
}: {
  value: string;
  onChange: (cronExpression: string) => void;
}) {
  const [mode, setMode] = useState<"preset" | "custom">("preset");
  const [presetFreq, setPresetFreq] = useState<"hourly" | "daily" | "weekly">(
    "daily",
  );
  const [time, setTime] = useState("09:00");
  const [day, setDay] = useState("1");
  const [hourInterval, setHourInterval] = useState(1);

  useEffect(() => {
    if (mode !== "preset") return;
    onChange(buildCronFromPreset(presetFreq, time, day, hourInterval));
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [mode, presetFreq, time, day, hourInterval]);

  return (
    <Stack gap="sm">
      <SegmentedControl
        value={mode}
        onChange={(val) => setMode(val as "preset" | "custom")}
        data={[
          { value: "preset", label: "Preset" },
          { value: "custom", label: "Custom Cron" },
        ]}
      />
      {mode === "preset" ? (
        <Stack gap="sm">
          <Select
            label="Frekuensi"
            data={[
              { value: "hourly", label: "Setiap X jam" },
              { value: "daily", label: "Setiap hari" },
              { value: "weekly", label: "Setiap minggu" },
            ]}
            value={presetFreq}
            onChange={(val) =>
              setPresetFreq((val as "hourly" | "daily" | "weekly") ?? "daily")
            }
            allowDeselect={false}
          />
          {presetFreq === "hourly" && (
            <NumberInput
              label="Setiap berapa jam"
              description="Contoh: 3 artinya diposting tiap 3 jam sekali (00:00, 03:00, 06:00, dst)"
              min={1}
              max={23}
              value={hourInterval}
              onChange={(val) =>
                setHourInterval(typeof val === "number" ? val : 1)
              }
            />
          )}
          {presetFreq === "weekly" && (
            <Select
              label="Hari"
              data={DAY_OPTIONS}
              value={day}
              onChange={(val) => setDay(val ?? "1")}
              allowDeselect={false}
            />
          )}
          {presetFreq !== "hourly" && (
            <TimeInput
              label="Jam"
              value={time}
              onChange={(e) => setTime(e.currentTarget.value)}
            />
          )}
          <Text size="xs" c="dimmed">
            Jadwal: {value} (waktu Asia/Jakarta)
          </Text>
        </Stack>
      ) : (
        <Stack gap="sm">
          <TextInput
            label="Cron Expression"
            description="Format 5-field: menit jam tanggal bulan hari (mis. 0 9 * * * = setiap hari jam 9 pagi)"
            placeholder="0 9 * * *"
            value={value}
            onChange={(e) => onChange(e.currentTarget.value)}
          />
        </Stack>
      )}
    </Stack>
  );
}
