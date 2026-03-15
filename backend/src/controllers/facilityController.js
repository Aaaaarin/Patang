import Facility from '../models/Facility.js';
import SportsSlot from '../models/SportsSlot.js';
import FacilityBlock from '../models/FacilityBlock.js';

export const listFacilities = async (req, res) => {
    try {
        const query = {};

        if (req.query.facilityType) {
            query.facilityType = req.query.facilityType;
        }

        if (req.query.sportType) {
            query.sportType = req.query.sportType;
        }

        const facilities = await Facility.find(query).sort({ name: 1 });
        res.json(facilities);
    } catch (error) {
        res.status(500).json({ message: error.message });
    }
};

export const createFacility = async (req, res) => {
    try {
        const facility = await Facility.create(req.body);
        res.status(201).json(facility);
    } catch (error) {
        res.status(400).json({ message: error.message });
    }
};

export const createSportsSlot = async (req, res) => {
    try {
        const slot = await SportsSlot.create(req.body);
        res.status(201).json(slot);
    } catch (error) {
        res.status(400).json({ message: error.message });
    }
};

export const getFacilitySlots = async (req, res) => {
    try {
        const slots = await SportsSlot.find({
            facility: req.params.facilityId,
            isActive: true
        }).sort({ startTime: 1 });

        res.json(slots);
    } catch (error) {
        res.status(500).json({ message: error.message });
    }
};

export const createFacilityBlock = async (req, res) => {
    try {
        const block = await FacilityBlock.create({
            ...req.body,
            requestedBy: req.user._id
        });

        res.status(201).json(block);
    } catch (error) {
        res.status(400).json({ message: error.message });
    }
};
