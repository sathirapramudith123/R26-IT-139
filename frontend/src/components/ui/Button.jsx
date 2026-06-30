export default function Button({ children, className = "", variant = "primary", size = "md", ...props }) {
  const v = { primary: "btn-primary", secondary: "btn-secondary", danger: "btn-danger", ghost: "btn-ghost" };
  const s = { sm: "px-3 py-1.5 text-xs", md: "px-5 py-2.5 text-sm", lg: "px-7 py-3 text-base" };
  return <button className={`${v[variant]} ${s[size]} ${className}`} {...props}>{children}</button>;
}