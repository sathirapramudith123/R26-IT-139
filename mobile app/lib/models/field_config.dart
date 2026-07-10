class FieldConfig {
  final String key;
  final String label;
  final String type; 
  final List<String> options;       
  final String? optionsSource;      
  final String? optionsLabelKey;    
  final bool required;

  const FieldConfig(
    this.key,
    this.label, {
    this.type = "text",
    this.options = const [],
    this.optionsSource,
    this.optionsLabelKey,
    this.required = false,
  });
}