import * as React from "react";
import { Button, ButtonProps } from "@/components/ui/button";
import { cn } from "@/lib/utils";

interface CustomButtonProps extends ButtonProps {
  children: React.ReactNode;
}

export const PrimaryButton: React.FC<CustomButtonProps> = ({ className, children, ...props }) => (
  <Button
    className={cn(
      "bg-brand text-brand-foreground shadow-lg hover:bg-brand/90 transition-all duration-300 hover:scale-[1.02] active:scale-[0.98] font-semibold rounded-xl",
      className
    )}
    {...props}
  >
    {children}
  </Button>
);

export const SecondaryButton: React.FC<CustomButtonProps> = ({ className, children, ...props }) => (
  <Button
    variant="outline"
    className={cn(
      "border-brand text-brand bg-transparent hover:bg-brand-soft/50 transition-all duration-300 hover:scale-[1.02] active:scale-[0.98] font-semibold rounded-xl",
      className
    )}
    {...props}
  >
    {children}
  </Button>
);

export const DestructiveButton: React.FC<CustomButtonProps> = ({ className, children, ...props }) => (
  <Button
    variant="destructive"
    className={cn(
      "shadow-md hover:shadow-lg transition-all duration-300 hover:scale-[1.02] active:scale-[0.98] font-semibold rounded-xl",
      className
    )}
    {...props}
  >
    {children}
  </Button>
);