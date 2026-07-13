CREATE DATABASE fastflash;
USE fastflash;

CREATE TABLE users (
    id VARCHAR(36) PRIMARY KEY,
    email VARCHAR(255) UNIQUE NOT NULL,
    password VARCHAR(255) NOT NULL,
    name VARCHAR(100),
    phone VARCHAR(20),
    address TEXT,
    subscription ENUM('none', 'five', 'duo', 'group') DEFAULT 'none',
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE cocktails (
    id INT AUTO_INCREMENT PRIMARY KEY,
    name VARCHAR(255) NOT NULL,
    description TEXT,
    type VARCHAR(100),
    price_50cl DECIMAL(10,2),
    price_1l DECIMAL(10,2),
    image_url VARCHAR(255),
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE ingredients (
    id INT AUTO_INCREMENT PRIMARY KEY,
    cocktail_id INT,
    name VARCHAR(255),
    FOREIGN KEY (cocktail_id) REFERENCES cocktails(id)
);

CREATE TABLE orders (
    id VARCHAR(36) PRIMARY KEY,
    user_id VARCHAR(36),
    total DECIMAL(10,2) NOT NULL,
    status ENUM('pending', 'processing', 'completed', 'cancelled') DEFAULT 'pending',
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (user_id) REFERENCES users(id)
);

CREATE TABLE order_items (
    id VARCHAR(36) PRIMARY KEY,
    order_id VARCHAR(36),
    cocktail_id VARCHAR(36),
    quantity INT NOT NULL,
    price DECIMAL(10,2) NOT NULL,
    volume VARCHAR(10) NOT NULL,
    FOREIGN KEY (order_id) REFERENCES orders(id)
); 