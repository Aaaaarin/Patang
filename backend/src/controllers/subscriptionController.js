import crypto from 'crypto';
import Facility from '../models/Facility.js';
import SubscriptionPlan from '../models/SubscriptionPlan.js';
import Subscription from '../models/Subscription.js';
import AccessPass from '../models/AccessPass.js';
import AccessLog from '../models/AccessLog.js';

const ADMIN_ROLES = ['admin', 'executive', 'gym_admin', 'swim_admin'];

const buildPaymentProof = (payload = {}) => ({
    url: payload.url,
    fileName: payload.fileName,
    uploadedAt: new Date(),
    receiptNumber: payload.receiptNumber
});

export const listSubscriptionPlans = async (req, res) => {
    try {
        const query = { isActive: true };

        if (req.query.type) {
            query.type = req.query.type;
        }

        const plans = await SubscriptionPlan.find(query).sort({ type: 1, price: 1 });
        res.json(plans);
    } catch (error) {
        res.status(500).json({ message: error.message });
    }
};

export const createSubscriptionPlan = async (req, res) => {
    try {
        const plan = await SubscriptionPlan.create(req.body);
        res.status(201).json(plan);
    } catch (error) {
        res.status(400).json({ message: error.message });
    }
};

export const createSubscriptionRequest = async (req, res) => {
    try {
        const { planId, facilityId, paymentProof } = req.body;

        if (!planId || !paymentProof?.url) {
            return res.status(400).json({ message: 'planId and paymentProof.url are required' });
        }

        const plan = await SubscriptionPlan.findById(planId);

        if (!plan || !plan.isActive) {
            return res.status(404).json({ message: 'Subscription plan not found' });
        }

        let facility = null;

        if (facilityId) {
            facility = await Facility.findById(facilityId);

            if (!facility) {
                return res.status(404).json({ message: 'Facility not found' });
            }

            if (facility.facilityType !== plan.type) {
                return res.status(400).json({ message: 'Facility type does not match the selected plan' });
            }
        }

        const existing = await Subscription.findOne({
            user: req.user._id,
            type: plan.type,
            status: { $in: ['pending', 'approved', 'active'] }
        });

        if (existing) {
            return res.status(400).json({ message: 'You already have a pending or active request for this subscription type' });
        }

        const subscription = await Subscription.create({
            user: req.user._id,
            plan: plan._id,
            facility: facility?._id,
            type: plan.type,
            planDuration: plan.planDuration,
            paymentProof: buildPaymentProof(paymentProof)
        });

        const populatedSubscription = await Subscription.findById(subscription._id)
            .populate('plan')
            .populate('facility');

        res.status(201).json(populatedSubscription);
    } catch (error) {
        res.status(400).json({ message: error.message });
    }
};

export const listMySubscriptions = async (req, res) => {
    try {
        const subscriptions = await Subscription.find({ user: req.user._id })
            .populate('plan')
            .populate('facility')
            .sort({ createdAt: -1 });

        res.json(subscriptions);
    } catch (error) {
        res.status(500).json({ message: error.message });
    }
};

export const listPendingSubscriptionRequests = async (req, res) => {
    try {
        const status = req.query.status?.toLowerCase() || 'pending';
        const subscriptions = await Subscription.find({ status })
            .populate('user', 'name email profileDetails.rollNumber')
            .populate('plan')
            .populate('facility')
            .sort({ createdAt: 1 });

        res.json(subscriptions);
    } catch (error) {
        res.status(500).json({ message: error.message });
    }
};

export const approveSubscriptionRequest = async (req, res) => {
    try {
        const subscription = await Subscription.findById(req.params.id).populate('plan');

        if (!subscription) {
            return res.status(404).json({ message: 'Subscription request not found' });
        }

        const startsAt = new Date();
        const endsAt = new Date(startsAt.getTime() + subscription.plan.validityDays * 24 * 60 * 60 * 1000);

        subscription.status = 'active';
        subscription.startsAt = startsAt;
        subscription.endsAt = endsAt;
        subscription.adminReview = {
            reviewedBy: req.user._id,
            reviewedAt: new Date(),
            reason: req.body.reason
        };
        await subscription.save();

        const qrToken = crypto.randomBytes(24).toString('hex');

        await AccessPass.findOneAndUpdate(
            { subscription: subscription._id },
            {
                subscription: subscription._id,
                qrToken,
                validUntil: endsAt,
                isActive: true
            },
            { upsert: true, new: true, setDefaultsOnInsert: true }
        );

        const populatedSubscription = await Subscription.findById(subscription._id)
            .populate('plan')
            .populate('facility')
            .populate('adminReview.reviewedBy', 'name email roles');

        res.json(populatedSubscription);
    } catch (error) {
        res.status(500).json({ message: error.message });
    }
};

export const rejectSubscriptionRequest = async (req, res) => {
    try {
        const subscription = await Subscription.findById(req.params.id);

        if (!subscription) {
            return res.status(404).json({ message: 'Subscription request not found' });
        }

        subscription.status = 'rejected';
        subscription.adminReview = {
            reviewedBy: req.user._id,
            reviewedAt: new Date(),
            reason: req.body.reason || 'Rejected during review'
        };
        await subscription.save();

        res.json(subscription);
    } catch (error) {
        res.status(500).json({ message: error.message });
    }
};

export const scanAccessPass = async (req, res) => {
    try {
        const { qrToken, action } = req.body;

        if (!qrToken || !['entry', 'exit'].includes(action)) {
            return res.status(400).json({ message: 'qrToken and a valid action are required' });
        }

        const pass = await AccessPass.findOne({
            qrToken,
            isActive: true,
            validUntil: { $gt: new Date() }
        }).populate({
            path: 'subscription',
            populate: [{ path: 'user', select: 'name email profileDetails.rollNumber' }, { path: 'plan' }]
        });

        if (!pass || !pass.subscription || pass.subscription.status !== 'active') {
            return res.status(404).json({ message: 'Access pass is invalid or expired' });
        }

        const log = await AccessLog.create({
            user: pass.subscription.user._id,
            subscription: pass.subscription._id,
            facilityType: pass.subscription.type,
            action,
            scannedBy: req.user._id
        });

        res.json({
            access: 'granted',
            subscription: pass.subscription,
            log
        });
    } catch (error) {
        res.status(500).json({ message: error.message });
    }
};

export const authorizeSubscriptionAdmin = (req, res, next) => {
    const hasRole = req.user.roles.some((role) => ADMIN_ROLES.includes(role));

    if (!hasRole) {
        return res.status(403).json({ message: 'Access forbidden: subscription admin role required' });
    }

    next();
};
