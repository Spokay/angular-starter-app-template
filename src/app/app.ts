import { Component } from '@angular/core';
import { RouterOutlet } from '@angular/router';

import { Footer } from './layout/footer/footer';
import { Header } from './layout/header/header';

@Component({
  selector: 'app-root',
  templateUrl: 'app.html',
  imports: [RouterOutlet, Header, Footer],
})
export class App {}
