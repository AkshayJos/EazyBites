import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';

const CategoryModal = ({ isOpen, onClose, onSubmit, category, mode = 'add' }) => {
    const [formData, setFormData] = useState({
        categoryName: '',
        visible: true
    });
    const [isSubmitting, setIsSubmitting] = useState(false);
    const [error, setError] = useState('');

    useEffect(() => {
        if (category && mode === 'edit') {
            setFormData({
                categoryName: category.categoryName,
                visible: category.visibility ?? true
            });
        }
    }, [category, mode]);

    const handleSubmit = async (e) => {
        e.preventDefault();
        setIsSubmitting(true);
        setError('');

        try {
            await onSubmit({
                categoryName: formData.categoryName,
                visibility: formData.visible
            });
            
            if (mode === 'add') {
                setFormData({ categoryName: '', visible: true });
            }
        } catch (error) {
            setError('Error submitting form');
        } finally {
            setIsSubmitting(false);
        }
    };

    return (
        <AnimatePresence>
            {isOpen && (
                <motion.div
                    className="MyMenu-modal-overlay"
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 1 }}
                    exit={{ opacity: 0 }}
                    onClick={onClose}
                >
                    <motion.div
                        className="MyMenu-modal"
                        initial={{ scale: 0.8, opacity: 0 }}
                        animate={{ scale: 1, opacity: 1 }}
                        exit={{ scale: 0.8, opacity: 0 }}
                        onClick={e => e.stopPropagation()}
                    >
                        <h2>{mode === 'add' ? 'Add New Category' : 'Edit Category'}</h2>
                        {error && (
                            <div className="MyMenu-error-message">
                                {error}
                            </div>
                        )}
                        <form onSubmit={handleSubmit}>
                            <div className="MyMenu-form-group">
                                <label>Category Name *</label>
                                <input
                                    type="text"
                                    required
                                    value={formData.categoryName}
                                    onChange={e => setFormData({ ...formData, categoryName: e.target.value })}
                                />
                            </div>
                            <div className="MyMenu-form-group">
                                <label>
                                    <input
                                        type="checkbox"
                                        checked={formData.visible}
                                        onChange={e => setFormData({ ...formData, visible: e.target.checked })}
                                    />
                                    Visible to Customers
                                </label>
                            </div>
                            <div className="MyMenu-modal-actions">
                                <button 
                                    type="button" 
                                    onClick={onClose} 
                                    className="MyMenu-cancel-btn"
                                    disabled={isSubmitting}
                                >
                                    Cancel
                                </button>
                                <button 
                                    type="submit" 
                                    className="MyMenu-submit-btn"
                                    disabled={isSubmitting}
                                >
                                    {isSubmitting ? 'Submitting...' : mode === 'add' ? 'Add Category' : 'Update Category'}
                                </button>
                            </div>
                        </form>
                    </motion.div>
                </motion.div>
            )}
        </AnimatePresence>
    );
};

export default CategoryModal;