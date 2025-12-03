import React from "react";
import { useFormContext } from "react-hook-form";
import { Switch } from "@/components/ui/switch";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import { AgentScheduleConfig } from "@/services/zapCorretor";
import { cn } from "@/lib/utils";

const DAYS_OF_WEEK = [
  { key: 'monday', label: 'Segunda-feira' },
  { key: 'tuesday', label: 'Terça-feira' },
  { key: 'wednesday', label: 'Quarta-feira' },
  { key: 'thursday', label: 'Quinta-feira' },
  { key: 'friday', label: 'Sexta-feira' },
  { key: 'saturday', label: 'Sábado' },
  { key: 'sunday', label: 'Domingo' },
];

interface AgentScheduleFormProps {
    isSubmitting: boolean;
}

const AgentScheduleForm: React.FC<AgentScheduleFormProps> = ({ isSubmitting }) => {
  const { watch, setValue, register } = useFormContext();
  
  const scheduleEnabled = watch('scheduleEnabled');
  const scheduleConfig: AgentScheduleConfig = watch('scheduleConfig') || {};

  const handleTimeChange = (dayKey: string, index: 0 | 1, value: string) => {
    const currentDayConfig = scheduleConfig[dayKey] || ["09:00", "18:00"];
    const newConfig = [...currentDayConfig] as [string, string];
    newConfig[index] = value;
    
    setValue(`scheduleConfig.${dayKey}`, newConfig, { shouldDirty: true });
  };
  
  const handleDayToggle = (dayKey: string, isChecked: boolean) => {
      if (isChecked) {
          // Set default times when enabling
          setValue(`scheduleConfig.${dayKey}`, ["09:00", "18:00"], { shouldDirty: true });
      } else {
          // Set null when disabling
          setValue(`scheduleConfig.${dayKey}`, null, { shouldDirty: true });
      }
  };
  
  const isDayActive = (dayKey: string) => scheduleConfig[dayKey] !== null && scheduleConfig[dayKey] !== undefined;

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between space-x-2">
        <Label htmlFor="schedule-enabled-toggle" className="flex flex-col space-y-1">
          <span>Habilitar Escala de Atendimento</span>
          <span className="font-normal leading-snug text-muted-foreground">
            Se desativado, o corretor recebe alertas 24/7. Se ativado, apenas nos horários configurados.
          </span>
        </Label>
        <Switch
          id="schedule-enabled-toggle"
          checked={scheduleEnabled}
          onCheckedChange={(checked) => setValue('scheduleEnabled', checked, { shouldDirty: true })}
          disabled={isSubmitting}
        />
      </div>

      {scheduleEnabled && (
        <div className="space-y-3 p-4 border rounded-md bg-muted/50">
          <h4 className="font-semibold text-sm">Horários de Alerta de Leads</h4>
          
          {DAYS_OF_WEEK.map(({ key, label }) => (
            <div key={key} className={cn("flex items-center justify-between gap-4 p-2 rounded-md", isDayActive(key) ? "bg-background shadow-sm" : "opacity-60")}>
              <div className="flex items-center gap-3 w-1/3">
                <Switch
                    checked={isDayActive(key)}
                    onCheckedChange={(checked) => handleDayToggle(key, checked)}
                    disabled={isSubmitting}
                />
                <Label className="font-medium">{label}</Label>
              </div>
              
              <div className="flex gap-2 w-2/3">
                <Input
                  type="time"
                  value={scheduleConfig[key]?.[0] || "09:00"}
                  onChange={(e) => handleTimeChange(key, 0, e.target.value)}
                  disabled={!isDayActive(key) || isSubmitting}
                  className="w-1/2"
                />
                <span className="flex items-center text-muted-foreground">-</span>
                <Input
                  type="time"
                  value={scheduleConfig[key]?.[1] || "18:00"}
                  onChange={(e) => handleTimeChange(key, 1, e.target.value)}
                  disabled={!isDayActive(key) || isSubmitting}
                  className="w-1/2"
                />
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
};

export default AgentScheduleForm;