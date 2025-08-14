import { useState } from 'react';
import { Tab, TabGroup, TabList, TabPanel, TabPanels } from '@headlessui/react';
import Heading from '@components/ui/heading';
import ProductReviewRating from './product-review-rating';

function classNames(...classes: any) {
  return classes.filter(Boolean).join(' ');
}

export default function ProductDetailsTab({ lang }: { lang: string }) {
  let [tabHeading] = useState({
    Product_Details: '',
    Review_Rating: '',
  });

  return (
    <div className="w-full xl:px-2 py-11 lg:py-14 xl:py-16 sm:px-0">
      <TabGroup>
        <TabList className="block border-b border-border-base">
          {Object.keys(tabHeading).map((item) => (
            <Tab
              key={item}
              className={({ selected }) =>
                classNames(
                  'relative inline-block transition-all text-15px lg:text-17px leading-5 text-brand-dark focus:outline-none pb-3 lg:pb-5 hover:text-brand ltr:mr-8 rtl:ml-8',
                  selected
                    ? 'font-semibold after:absolute after:w-full after:h-0.5 after:bottom-0 after:translate-y-[1px] after:ltr:left-0 after:rtl:right-0 after:bg-brand'
                    : '',
                )
              }
            >
              {item.split('_').join(' ')}
            </Tab>
          ))}
        </TabList>
        <TabPanels className="mt-6 lg:mt-9">
          <TabPanel className="lg:flex">
            <div className="text-sm sm:text-15px text-brand-muted leading-[2em] space-y-4 lg:space-y-5 xl:space-y-7">
              <p>
                Stufa a pellet ad aria da 7KW. Questa stufa è progettata per essere posizionata in ambienti piccoli: le dimensioni ridotte la rendono perfetta per tutti i tipi di abitazione.
                Il rivestimento in acciaio inox copre la struttura compatta della stufa, che si adatta perfettamente a qualsiasi stile di casa.
                Braciere in ghisa. Camera di combustione in acciaio. Capacità serbatoio pellet 11kg. Diametro uscita fumi Ø80mm.
                Telecomando (optional - disponibile su ordinazione). Possibilità di controllo remoto tramite Wi-Fi (optional - disponibile su ordinazione).
              </p>
            </div>

            <div className="shrink-0 lg:w-[400px] xl:w-[480px] 2xl:w-[550px] 3xl:w-[680px] lg:ltr:pl-10 lg:rtl:pr-10 xl:ltr:pl-14 xl:rtl:pr-14 2xl:ltr:pl-20 2xl:rtl:pr-20 pt-5 lg:pt-0">
              <Heading variant="mediumHeading" className="xl:text-lg mb-4 pt-0.5">
                Caratteristiche Tecniche
              </Heading>
              <div className="border rounded border-border-four">
                <table className="w-full text-brand-dark text-15px">
                  <tbody>
                    <tr className="border-b border-border-four">
                      <td className="px-4 py-3 lg:px-5 xl:px-6">Codice Fornitore</td>
                      <td className="border-s border-border-four px-4 py-3 lg:px-5 xl:px-6 text-right">MIGNON6-B</td>
                    </tr>
                    <tr className="border-b border-border-four">
                      <td className="px-4 py-3 lg:px-5 xl:px-6">RAEE</td>
                      <td className="border-s border-border-four px-4 py-3 lg:px-5 xl:px-6 text-right">1.62</td>
                    </tr>
                    <tr className="border-b border-border-four">
                      <td className="px-4 py-3 lg:px-5 xl:px-6">Pagina Catalogo</td>
                      <td className="border-s border-border-four px-4 py-3 lg:px-5 xl:px-6 text-right">486</td>
                    </tr>
                    <tr className="border-b border-border-four">
                      <td className="px-4 py-3 lg:px-5 xl:px-6">EAN</td>
                      <td className="border-s border-border-four px-4 py-3 lg:px-5 xl:px-6 text-right">8054602013748</td>
                    </tr>
                    <tr className="border-b border-border-four">
                      <td className="px-4 py-3 lg:px-5 xl:px-6">Seriale Modello</td>
                      <td className="border-s border-border-four px-4 py-3 lg:px-5 xl:px-6 text-right">VESUVIO 7</td>
                    </tr>
                    <tr className="border-b border-border-four">
                      <td className="px-4 py-3 lg:px-5 xl:px-6">Versione</td>
                      <td className="border-s border-border-four px-4 py-3 lg:px-5 xl:px-6 text-right">AD ARIA</td>
                    </tr>
                    <tr className="border-b border-border-four">
                      <td className="px-4 py-3 lg:px-5 xl:px-6">Potenza</td>
                      <td className="border-s border-border-four px-4 py-3 lg:px-5 xl:px-6 text-right">7 KW</td>
                    </tr>
                    <tr className="border-b border-border-four">
                      <td className="px-4 py-3 lg:px-5 xl:px-6">Alimentazione</td>
                      <td className="border-s border-border-four px-4 py-3 lg:px-5 xl:px-6 text-right">ELETTRICA</td>
                    </tr>
                    <tr>
                      <td className="px-4 py-3 lg:px-5 xl:px-6">Classe Energetica</td>
                      <td className="border-s border-border-four px-4 py-3 lg:px-5 xl:px-6 text-right">A+</td>
                    </tr>
                  </tbody>
                </table>
              </div>

            </div>
          </TabPanel>
          <TabPanel>
            <ProductReviewRating lang={lang} />
          </TabPanel>
        </TabPanels>
      </TabGroup>
    </div>
  );
}
