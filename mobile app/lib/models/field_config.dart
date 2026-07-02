class FieldConfig {
  final String key;
  final String label;
  final String type; // "text" | "number" | "select"
  final List<String> options; // for select
  final bool required;

  const FieldConfig(
    this.key,
    this.label, {
    this.type = "text",
    this.options = const [],
    this.required = false,
  });
}