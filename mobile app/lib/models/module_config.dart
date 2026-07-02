import 'field_config.dart';

class ModuleConfig {
  final String title;   // "Inventory"
  final String path;    // "/inventory"
  final String icon;    // emoji
  final List<FieldConfig> fields;
  final List<String> listColumns; // keys shown in the list (first = title)

  const ModuleConfig({
    required this.title,
    required this.path,
    required this.icon,
    required this.fields,
    required this.listColumns,
  });
}