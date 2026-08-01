import { getDB } from '../config/mongodb.js';

export const getFavoriteCharts = async (req, res) => {
  try {
    const db = getDB();
    const collection = db.collection('chart_favorites');
    const favorites = await collection.find().sort({ createdAt: -1 }).toArray();
    res.json({ success: true, favorites });
  } catch (error) {
    res.status(500).json({ success: false, error: error.message });
  }
};

export const toggleFavoriteChart = async (req, res) => {
  try {
    const { chartId, chartTitle, chartType, chartData } = req.body;
    if (!chartId) {
      throw new Error('chartId is required');
    }

    const db = getDB();
    const collection = db.collection('chart_favorites');

    const existing = await collection.findOne({ chartId });
    if (existing) {
      await collection.deleteOne({ chartId });
      return res.json({ success: true, isFavorite: false, message: 'Chart removed from favorites' });
    }

    const newFavorite = {
      chartId,
      chartTitle: chartTitle || 'Analytics Chart',
      chartType: chartType || 'bar',
      chartData: chartData || [],
      isFavorite: true,
      createdAt: new Date()
    };

    await collection.insertOne(newFavorite);
    res.json({ success: true, isFavorite: true, favorite: newFavorite, message: 'Chart saved to favorites' });
  } catch (error) {
    res.status(400).json({ success: false, error: error.message });
  }
};

export const deleteFavoriteChart = async (req, res) => {
  try {
    const { chartId } = req.params;
    if (!chartId) {
      throw new Error('chartId parameter is required');
    }

    const db = getDB();
    const collection = db.collection('chart_favorites');

    await collection.deleteOne({ chartId });
    res.json({ success: true, message: 'Favorite chart deleted successfully' });
  } catch (error) {
    res.status(400).json({ success: false, error: error.message });
  }
};
