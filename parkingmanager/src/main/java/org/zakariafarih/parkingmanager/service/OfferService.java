package org.zakariafarih.parkingmanager.service;

import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.stereotype.Service;
import org.zakariafarih.parkingmanager.model.Offer;
import org.zakariafarih.parkingmanager.model.User;
import org.zakariafarih.parkingmanager.repository.OfferRepository;
import java.util.List;

@Service
public class OfferService {

    @Autowired
    private OfferRepository offerRepository;

    public Offer createOffer(Offer offer) {
        return offerRepository.save(offer);
    }

    public List<Offer> getOffersForUser(User user) {
        return offerRepository.findByUser(user);
    }
}
