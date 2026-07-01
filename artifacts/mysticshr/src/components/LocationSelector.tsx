import { useMemo } from "react";
import { Country, State, City } from "country-state-city";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";

interface LocationSelectorProps {
  country: string;
  state: string;
  city: string;
  onCountryChange: (v: string) => void;
  onStateChange: (v: string) => void;
  onCityChange: (v: string) => void;
  layout?: "row" | "stack";
}

export function LocationSelector({
  country,
  state,
  city,
  onCountryChange,
  onStateChange,
  onCityChange,
  layout = "row",
}: LocationSelectorProps) {
  const allCountries = useMemo(() => Country.getAllCountries(), []);

  const countryIso = useMemo(
    () => allCountries.find((c) => c.name === country)?.isoCode ?? null,
    [allCountries, country]
  );

  const states = useMemo(
    () => (countryIso ? State.getStatesOfCountry(countryIso) : []),
    [countryIso]
  );

  const stateIso = useMemo(
    () => states.find((s) => s.name === state)?.isoCode ?? null,
    [states, state]
  );

  const cities = useMemo(
    () => (countryIso && stateIso ? City.getCitiesOfState(countryIso, stateIso) : []),
    [countryIso, stateIso]
  );

  const handleCountryChange = (v: string) => {
    onCountryChange(v);
    onStateChange("");
    onCityChange("");
  };

  const handleStateChange = (v: string) => {
    onStateChange(v);
    onCityChange("");
  };

  const wrapper = layout === "row"
    ? "grid grid-cols-1 sm:grid-cols-3 gap-3"
    : "space-y-3";

  return (
    <div className={wrapper}>
      <div className="space-y-1.5">
        <Label>Country</Label>
        <Select value={country || "__none__"} onValueChange={(v) => handleCountryChange(v === "__none__" ? "" : v)}>
          <SelectTrigger>
            <SelectValue placeholder="Select country…" />
          </SelectTrigger>
          <SelectContent className="max-h-64 overflow-y-auto">
            {allCountries.map((c) => (
              <SelectItem key={c.isoCode} value={c.name}>
                {c.name}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

      <div className="space-y-1.5">
        <Label>State</Label>
        {states.length > 0 ? (
          <Select
            value={state || "__none__"}
            onValueChange={(v) => handleStateChange(v === "__none__" ? "" : v)}
            disabled={!country}
          >
            <SelectTrigger>
              <SelectValue placeholder="Select state…" />
            </SelectTrigger>
            <SelectContent className="max-h-64 overflow-y-auto">
              {states.map((s) => (
                <SelectItem key={s.isoCode} value={s.name}>
                  {s.name}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        ) : (
          <Input
            value={state}
            onChange={(e) => handleStateChange(e.target.value)}
            placeholder="State / Province"
            disabled={!country}
          />
        )}
      </div>

      <div className="space-y-1.5">
        <Label>City</Label>
        {cities.length > 0 ? (
          <Select
            value={city || "__none__"}
            onValueChange={(v) => onCityChange(v === "__none__" ? "" : v)}
            disabled={!state}
          >
            <SelectTrigger>
              <SelectValue placeholder="Select city…" />
            </SelectTrigger>
            <SelectContent className="max-h-64 overflow-y-auto">
              {cities.map((c) => (
                <SelectItem key={c.name} value={c.name}>
                  {c.name}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        ) : (
          <Input
            value={city}
            onChange={(e) => onCityChange(e.target.value)}
            placeholder="City"
            disabled={!country}
          />
        )}
      </div>
    </div>
  );
}
