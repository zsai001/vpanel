import { forwardRef, InputHTMLAttributes, TextareaHTMLAttributes, SelectHTMLAttributes } from 'react';
import { cn } from '@/utils/cn';

// Input
export interface InputProps extends InputHTMLAttributes<HTMLInputElement> {
  error?: boolean;
  leftIcon?: React.ReactNode;
  rightIcon?: React.ReactNode;
}

export const Input = forwardRef<HTMLInputElement, InputProps>(
  ({ className, error, leftIcon, rightIcon, ...props }, ref) => (
    <div className="relative">
      {leftIcon && (
        <div className="absolute left-3 top-1/2 -translate-y-1/2 text-dark-500">
          {leftIcon}
        </div>
      )}
      <input
        ref={ref}
        className={cn(
          'w-full px-4 py-2.5 bg-dark-900/50 border rounded-lg',
          'text-dark-100 placeholder:text-dark-500',
          'focus:outline-none focus:ring-2 focus:ring-primary-500/50',
          'transition-all duration-200',
          error ? 'border-red-500 focus:border-red-500' : 'border-dark-700 focus:border-primary-500',
          leftIcon && 'pl-10',
          rightIcon && 'pr-10',
          className
        )}
        {...props}
      />
      {rightIcon && (
        <div className="absolute right-3 top-1/2 -translate-y-1/2 text-dark-500">
          {rightIcon}
        </div>
      )}
    </div>
  )
);

Input.displayName = 'Input';

// Textarea
export interface TextareaProps extends TextareaHTMLAttributes<HTMLTextAreaElement> {
  error?: boolean;
}

export const Textarea = forwardRef<HTMLTextAreaElement, TextareaProps>(
  ({ className, error, ...props }, ref) => (
    <textarea
      ref={ref}
      className={cn(
        'w-full px-4 py-2.5 bg-dark-900/50 border rounded-lg',
        'text-dark-100 placeholder:text-dark-500',
        'focus:outline-none focus:ring-2 focus:ring-primary-500/50',
        'transition-all duration-200 resize-none',
        error ? 'border-red-500 focus:border-red-500' : 'border-dark-700 focus:border-primary-500',
        className
      )}
      {...props}
    />
  )
);

Textarea.displayName = 'Textarea';

// Select
export interface SelectProps extends SelectHTMLAttributes<HTMLSelectElement> {
  error?: boolean;
}

export const Select = forwardRef<HTMLSelectElement, SelectProps>(
  ({ className, error, children, ...props }, ref) => (
    <select
      ref={ref}
      className={cn(
        'w-full px-4 py-2.5 bg-dark-900/50 border rounded-lg',
        'text-dark-100',
        'focus:outline-none focus:ring-2 focus:ring-primary-500/50',
        'transition-all duration-200',
        error ? 'border-red-500 focus:border-red-500' : 'border-dark-700 focus:border-primary-500',
        className
      )}
      {...props}
    >
      {children}
    </select>
  )
);

Select.displayName = 'Select';

// Checkbox
export interface CheckboxProps extends InputHTMLAttributes<HTMLInputElement> {
  label?: string;
}

export const Checkbox = forwardRef<HTMLInputElement, CheckboxProps>(
  ({ className, label, ...props }, ref) => (
    <label className="flex items-center gap-2 cursor-pointer">
      <input
        ref={ref}
        type="checkbox"
        className={cn(
          'w-4 h-4 rounded border-dark-600 bg-dark-900',
          'text-primary-500 focus:ring-primary-500 focus:ring-offset-dark-900',
          className
        )}
        {...props}
      />
      {label && <span className="text-dark-300 text-sm">{label}</span>}
    </label>
  )
);

Checkbox.displayName = 'Checkbox';

// Switch
export interface SwitchProps extends Omit<InputHTMLAttributes<HTMLInputElement>, 'type'> {
  label?: string;
}

export const Switch = forwardRef<HTMLInputElement, SwitchProps>(
  ({ className, label, checked, onChange, ...props }, ref) => (
    <label className="flex items-center gap-3 cursor-pointer">
      <div className="relative">
        <input
          ref={ref}
          type="checkbox"
          checked={checked}
          onChange={onChange}
          className="sr-only peer"
          {...props}
        />
        <div className={cn(
          'w-11 h-6 bg-dark-700 rounded-full',
          'peer-checked:bg-primary-500',
          'transition-colors duration-200'
        )} />
        <div className={cn(
          'absolute top-0.5 left-0.5 w-5 h-5 bg-white rounded-full shadow',
          'transition-transform duration-200',
          'peer-checked:translate-x-5'
        )} />
      </div>
      {label && <span className="text-dark-300 text-sm">{label}</span>}
    </label>
  )
);

Switch.displayName = 'Switch';

