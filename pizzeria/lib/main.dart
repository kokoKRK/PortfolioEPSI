import 'package:flutter/material.dart';
import 'package:provider/provider.dart';
import 'models/cart.dart';
import 'models/theme_notifier.dart';
import 'ui/home_page.dart';

void main() {
  runApp(
    MultiProvider(
      providers: [
        ChangeNotifierProvider(create: (_) => Cart()),
        ChangeNotifierProvider(create: (_) => ThemeNotifier()),
      ],
      child: const MyApp(),
    ),
  );
}

class MyApp extends StatelessWidget {
  const MyApp({super.key});

  @override
  Widget build(BuildContext context) {
    final themeNotifier = context.watch<ThemeNotifier>();

    final ThemeData lightTheme = ThemeData(
      colorScheme: ColorScheme.fromSeed(
        seedColor: Colors.red,
        brightness: Brightness.light,
      ),
      useMaterial3: true,
    );

    final ThemeData darkTheme = ThemeData(
      colorScheme: ColorScheme.fromSeed(
        seedColor: Colors.red,
        brightness: Brightness.dark,
      ),
      useMaterial3: true,
    );

    return MaterialApp(
      title: 'Pizzeria',
      debugShowCheckedModeBanner: false,
      theme: lightTheme,
      darkTheme: darkTheme,
      themeMode: themeNotifier.themeMode,
      home: const HomePage(),
    );
  }
}
