import 'package:flutter/material.dart';
import 'field_config.dart';

class ModuleConfig {
  final String title;   
  final String path;    
  final IconData icon;    
  final List<FieldConfig> fields;
  final List<String> listColumns; 

  const ModuleConfig({
    required this.title,
    required this.path,
    required this.icon,
    required this.fields,
    required this.listColumns,
  });
}