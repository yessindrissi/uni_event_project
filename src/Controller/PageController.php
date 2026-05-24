<?php

namespace App\Controller;

use Symfony\Bundle\FrameworkBundle\Controller\AbstractController;
use Symfony\Component\HttpFoundation\Response;
use Symfony\Component\Routing\Annotation\Route;

class PageController extends AbstractController
{
    #[Route('/', name: 'home')]
    public function home(): Response
    {
        return $this->render('pages/index.html.twig');
    }

    #[Route('/login', name: 'login')]
    public function login(): Response
    {
        return $this->render('pages/login.html.twig');
    }

    #[Route('/register', name: 'register')]
    public function register(): Response
    {
        return $this->render('pages/register.html.twig');
    }

    #[Route('/my-events', name: 'my_events')]
    public function myEvents(): Response
    {
        return $this->render('pages/my_events.html.twig');
    }

    #[Route('/event', name: 'event_details')]
    public function eventDetails(): Response
    {
        return $this->render('pages/event_details.html.twig');
    }
}