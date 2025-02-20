import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { useSearchParams } from "react-router-dom";
import axios from 'axios';
import FoodCard from './FoodCard';
import FoodModal from './FoodModal';
import Loader from '../../components/Loader/Loader';
import './MyMenu.css';

// API URL
const API = process.env.REACT_APP_API;

// Empty State Component
const EmptyState = () => (
    <motion.div
        className="MyMenu-empty-state"
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.5 }}
    >
        <h3>No Items Added Yet</h3>
        <p>Start adding items to your menu using the + button below!</p>
    </motion.div>
);

const MyMenu = () => {
    const [items, setItems] = useState([]);
    const [loading, setLoading] = useState(true);
    const [lastDoc, setLastDoc] = useState(null);
    const [hasMore, setHasMore] = useState(false);
    const [isModalOpen, setIsModalOpen] = useState(false);
    const [selectedItem, setSelectedItem] = useState(null);
    const [modalMode, setModalMode] = useState('add');
    const [searchParams] = useSearchParams();
    const uid = searchParams.get("uid");

    const fetchItems = async (isInitial = false) => {
        try {
            const response = await axios.get(
                `${API}/seller/${uid}?${lastDoc && !isInitial ? `lastDoc=${lastDoc}&` : ''}limit=10`
            );
            const data = response.data;

            setItems(isInitial ? data.items : [...items, ...data.items]);
            setLastDoc(data.lastDoc);
            setHasMore(data.hasMore);
        } catch (error) {
            console.error('Error fetching menu items:', error);
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        fetchItems(true);
    }, []);

    const handleAddItem = async (formData) => {
        try {
            await axios.post(`${API}/seller/${uid}/add`, formData);
            setIsModalOpen(false);
            fetchItems(true);
        } catch (error) {
            console.error('Error adding item:', error);
        }
    };

    const handleEditItem = async (formData) => {
        try {
            await axios.put(`${API}/seller/${uid}/update/${selectedItem.fid}`, formData);
            setIsModalOpen(false);
            setSelectedItem(null);
            fetchItems(true);
        } catch (error) {
            console.error('Error updating item:', error);
        }
    };

    const handleDeleteItem = async (fid) => {
        if (window.confirm('Are you sure you want to delete this item?')) {
            try {
                await axios.delete(`${API}/seller/${uid}/item/${fid}`);
                fetchItems(true);
            } catch (error) {
                console.error('Error deleting item:', error);
            }
        }
    };

    const openAddModal = () => {
        setModalMode('add');
        setSelectedItem(null);
        setIsModalOpen(true);
    };

    const openEditModal = async (item) => {
        try {
            // Fetch complete item details before opening modal
            const response = await axios.get(`${API}/seller/${uid}/item/${item.fid}`);
            setModalMode('edit');
            setSelectedItem(response.data);
            setIsModalOpen(true);
        } catch (error) {
            console.error('Error fetching item details:', error);
            alert('Failed to load item details. Please try again.');
        }
    };

    const handleModalSubmit = (formData) => {
        if (modalMode === 'add') {
            handleAddItem(formData);
        } else {
            handleEditItem(formData);
        }
    };

    return (
        <div className="MyMenu-container">
            <motion.header
                className="MyMenu-header"
                initial={{ opacity: 0, y: -20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.5 }}
            >
                <h1>Your Food Items</h1>
                <p className="MyMenu-header-subtitle">Manage your food items</p>
            </motion.header>
            {loading ? (
                <Loader />
            ) : (
                <>
                    {items.length === 0 ? (
                        <EmptyState />
                    ) : (
                        <div className="MyMenu-grid">
                            <AnimatePresence>
                                {items.map(item => (
                                    <FoodCard
                                        key={item.fid}
                                        item={item}
                                        onEdit={openEditModal}
                                        onDelete={handleDeleteItem}
                                    />
                                ))}
                            </AnimatePresence>
                        </div>
                    )}

                    {hasMore && (
                        <motion.button
                            className="MyMenu-load-more"
                            onClick={() => fetchItems()}
                            whileHover={{ scale: 1.05 }}
                            whileTap={{ scale: 0.95 }}
                        >
                            Load More
                        </motion.button>
                    )}

                    <motion.button
                        className="MyMenu-add-button"
                        onClick={openAddModal}
                        whileHover={{ scale: 1.1 }}
                        whileTap={{ scale: 0.9 }}
                    >
                        <span className="MyMenu-add-icon">+</span>
                        <span className="MyMenu-add-text">Add food item</span>
                    </motion.button>

                    <FoodModal
                        isOpen={isModalOpen}
                        onClose={() => {
                            setIsModalOpen(false);
                            setSelectedItem(null);
                        }}
                        onSubmit={handleModalSubmit}
                        foodItem={selectedItem}
                        mode={modalMode}
                    />
                </>
            )}
        </div>
    );
};

export default MyMenu;
