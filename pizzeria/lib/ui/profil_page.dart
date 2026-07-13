import 'package:flutter/material.dart';

class ProfilPage extends StatefulWidget {
  const ProfilPage({super.key});

  @override
  State<ProfilPage> createState() => _ProfilPageState();
}

class _ProfilPageState extends State<ProfilPage> {
  final _formKey = GlobalKey<FormState>();

  String _name = '';
  String _email = '';
  String _address = '';

  @override
  Widget build(BuildContext context) {
    return Scaffold(
      appBar: AppBar(
        title: const Text('Mon profil'),
      ),
      body: Padding(
        padding: const EdgeInsets.all(16.0),
        child: Form(
          key: _formKey,
          child: Column(
            children: [
              // Nom
              TextFormField(
                decoration: const InputDecoration(
                  labelText: 'Nom',
                  hintText: 'Entrez votre nom',
                  border: OutlineInputBorder(),
                ),
                validator: (value) {
                  if (value == null || value.isEmpty) {
                    return 'Le nom est obligatoire';
                  }
                  return null;
                },
                onSaved: (value) => _name = value ?? '',
              ),

              const SizedBox(height: 16),

              // Email
              TextFormField(
                decoration: const InputDecoration(
                  labelText: 'Email',
                  hintText: 'exemple@mail.com',
                  border: OutlineInputBorder(),
                ),
                keyboardType: TextInputType.emailAddress,
                validator: (value) {
                  if (value == null || value.isEmpty) {
                    return 'L\'email est obligatoire';
                  }
                  if (!value.contains('@')) {
                    return 'Email invalide';
                  }
                  return null;
                },
                onSaved: (value) => _email = value ?? '',
              ),

              const SizedBox(height: 16),

              // Adresse
              TextFormField(
                decoration: const InputDecoration(
                  labelText: 'Adresse',
                  hintText: 'Votre adresse de livraison',
                  border: OutlineInputBorder(),
                ),
                maxLines: 2,
                onSaved: (value) => _address = value ?? '',
              ),

              const SizedBox(height: 24),

              SizedBox(
                width: double.infinity,
                child: ElevatedButton(
                  onPressed: () {
                    if (_formKey.currentState!.validate()) {
                      _formKey.currentState!.save();

                      ScaffoldMessenger.of(context).showSnackBar(
                        SnackBar(
                          content: Text(
                            'Profil mis à jour : $_name, $_email',
                          ),
                        ),
                      );
                    }
                  },
                  child: const Text('Enregistrer'),
                ),
              ),
            ],
          ),
        ),
      ),
    );
  }
}
