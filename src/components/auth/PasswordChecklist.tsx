import React from "react";
import { Check, X } from "lucide-react";
import { cn } from "@/lib/utils";

interface PasswordChecklistProps {
  password: string;
}

const PasswordChecklist: React.FC<PasswordChecklistProps> = ({ password }) => {
  const checks = [
    {
      label: "Mínimo de 8 caracteres",
      isValid: password.length >= 8,
    },
    {
      label: "Uma letra maiúscula",
      isValid: /[A-Z]/.test(password),
    },
    {
      label: "Uma letra minúscula",
      isValid: /[a-z]/.test(password),
    },
    {
      label: "Um número",
      isValid: /[0-9]/.test(password),
    },
    {
      label: "Um caractere especial",
      isValid: /[^A-Za-z0-9]/.test(password),
    },
  ];

  return (
    <div className="space-y-1 text-sm mt-2">
      {checks.map((check, index) => (
        <div key={index} className="flex items-center gap-2">
          {check.isValid ? (
            <Check className="w-4 h-4 text-success" />
          ) : (
            <X className="w-4 h-4 text-destructive" />
          )}
          <span
            className={cn(
              check.isValid ? "text-success" : "text-muted-foreground",
            )}
          >
            {check.label}
          </span>
        </div>
      ))}
    </div>
  );
};

export default PasswordChecklist;