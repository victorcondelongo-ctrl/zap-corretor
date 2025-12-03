import React from 'react';
import { Button, ButtonProps } from "@/components/ui/button";
import { cn } from "@/lib/utils";

interface CustomButtonProps extends ButtonProps {
  children: React.ReactNode;
}

export const PrimaryButton: React.FC<CustomButtonProps> = ({ className, ...props }) => (
  <Button
    className={cn(
      "bg-brand text-brand-foreground hover:bg-brand/90 rounded-xl shadow-md transition-all duration-200",
      className
    )}
    {...props}
  >
    {props.children}
  </Button>
);

export const SecondaryButton: React.FC<CustomButtonProps> = ({ className, ...props }) => (
  <Button
    variant="outline"
    className={cn(
      "border-brand text-brand hover:bg-brand-soft/50 rounded-xl shadow-sm transition-all duration-200",
      className
    )}
    {...props}
  >
    {props.children}
  </Button>
);

export const DestructiveButton: React.FC<CustomButtonProps> = ({ className, ...props }) => (
  <Button
    variant="destructive"
    className={cn(
      "bg-destructive text-destructive-foreground hover:bg-destructive/90 rounded-xl shadow-sm transition-all duration-200",
      className
    )}
    {...props}
  >
    {props.children}
  </Button>
);